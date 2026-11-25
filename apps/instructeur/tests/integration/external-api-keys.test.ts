import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { createSession } from "@pitchou/server/session.ts";
import { admitExternalApiRequest } from "@pitchou/server/database/externalApi.ts";
import { dossierReadScope as scope, retiredStatusScope } from "@pitchou/types/externalApi.ts";
import type { Permission } from "@pitchou/types/permissions.ts";
import { createDossier } from "../factories/dossier.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { db } from "../setup/db.ts";
import { ADMIN_BASE_URL, INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

const personalPage = `${INTEGRATION_BASE_URL}/parametres/api`;
const personalData = `${personalPage}/__data.json`;
const personalKeys = `${personalPage}/keys`;
const integrations = `${ADMIN_BASE_URL}/api/integrations-api`;
const keyInput = { label: "Suivi des dossiers", scopes: [scope], days: 30 };

async function createAccount(email: string, permissions: Permission[]) {
  const [user] = await db("auth_user").insert({ email, active: true }).returning("id");
  await db("auth_permission").insert(
    permissions.map((permission) => ({ user_id: user.id, permission })),
  );
  const session = await createSession({ userId: user.id, email, name: "Test", idToken: null }, db);
  return { id: user.id, session };
}

function send(session: string, url: string, method: string, body: object) {
  return fetchAuthenticated(session, url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

function readDossier(id: number, secret: string) {
  return fetch(`${INTEGRATION_BASE_URL}/api/v1/dossiers/${id}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

test("a personal key is shown once, scoped to its owner and revocable", async () => {
  const owner = await createAccount("owner@example.test", ["dossier:read"]);
  const other = await createAccount("other@example.test", ["dossier:read"]);
  const visible = await createDossier(db);
  const hidden = await createDossier(db);
  const grant = { user_id: owner.id, dossier: visible.id, access_level: "read" };
  await db("dossier_user_access").insert(grant);

  const response = await send(owner.session, personalKeys, "POST", keyInput);
  expect(response.status).toBe(201);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const { key, secret } = await response.json();
  const row = await db("external_api_key").where({ id: key.id }).first();
  expect(row.secret_hash).toBe(createHash("sha256").update(secret).digest("hex"));
  expect(row.user_id).toBe(owner.id);
  expect(row.client_id).toBeNull();

  const settings = await fetchAuthenticated(owner.session, personalData);
  expect(settings.status).toBe(200);
  const data = await settings.text();
  expect(data).toContain(keyInput.label);
  expect(data).not.toContain(secret);
  expect(await (await fetchAuthenticated(other.session, personalData)).text()).not.toContain(
    keyInput.label,
  );
  expect((await send(other.session, personalKeys, "DELETE", { id: key.id })).status).toBe(404);

  const initial = await readDossier(visible.id, secret);
  expect(initial.status).toBe(200);
  expect(await initial.json()).toMatchObject({
    id: visible.id,
    status: "accompagnement_amont",
    status_changed_at: null,
  });
  expect(
    (await send(owner.session, personalKeys, "POST", { ...keyInput, scopes: [retiredStatusScope] }))
      .status,
  ).toBe(400);
  await db("external_api_key")
    .where({ id: key.id })
    .update({ scopes: [retiredStatusScope] });
  expect((await readDossier(visible.id, secret)).status).toBe(403);
  await db("external_api_key")
    .where({ id: key.id })
    .update({ scopes: [scope] });
  expect((await readDossier(hidden.id, secret)).status).toBe(404);
  expect((await db("external_api_key").where({ id: key.id }).first()).last_used_at).toBeInstanceOf(
    Date,
  );
  await db("dossier_user_access").where(grant).del();
  expect((await readDossier(visible.id, secret)).status).toBe(404);
  await db("dossier_user_access").insert(grant);
  expect((await send(owner.session, personalKeys, "DELETE", { id: key.id })).status).toBe(204);
  expect((await readDossier(visible.id, secret)).status).toBe(401);
});

test("rejects disabled owners and expired keys, and limits valid keys", async () => {
  const owner = await createAccount("rate@example.test", ["dossier:read"]);
  const { key, secret } = await (await send(owner.session, personalKeys, "POST", keyInput)).json();
  await db("external_api_key")
    .where({ id: key.id })
    .update({
      rate_window_start: db.raw(
        "date_trunc('minute', statement_timestamp()) + interval '1 minute'",
      ),
      requests_this_minute: 60,
    });
  expect((await readDossier(1, secret)).status).toBe(429);
  await db("auth_user").where({ id: owner.id }).update({ active: false });
  expect((await readDossier(1, secret)).status).toBe(401);
  await db("auth_user").where({ id: owner.id }).update({ active: true });
  await db("external_api_key")
    .where({ id: key.id })
    .update({
      created_at: db.raw("now() - interval '2 days'"),
      expires_at: db.raw("now() - interval '1 day'"),
    });
  expect((await readDossier(1, secret)).status).toBe(401);
});

test("admins manage integration-owned keys and grants independently of their own account", async () => {
  const admin = await createAccount("integrations@example.test", [
    "admin:access",
    "admin:api:manage",
  ]);
  const other = await createAccount("admin@example.test", ["admin:access"]);
  const visible = await createDossier(db);
  expect((await send(other.session, integrations, "POST", { name: "GeoMCE" })).status).toBe(403);
  expect(
    (await fetchAuthenticated(other.session, `${ADMIN_BASE_URL}/integrations-api`)).status,
  ).toBe(403);
  const created = await send(admin.session, integrations, "POST", { name: "GeoMCE" });
  expect(created.status).toBe(201);
  const { id } = await created.json();
  const service = `${integrations}/${id}`;
  const issued = await send(admin.session, `${service}/keys`, "POST", keyInput);
  expect(issued.status).toBe(201);
  const { key, secret } = await issued.json();
  const row = await db("external_api_key").where({ id: key.id }).first();
  expect(row.user_id).toBeNull();
  expect(row.client_id).toBe(id);
  expect(await admitExternalApiRequest(id, db, true)).toBe("disabled");
  expect((await readDossier(visible.id, secret)).status).toBe(404);

  const grant = { dossierId: visible.id, scope };
  expect((await send(admin.session, `${service}/grants`, "POST", grant)).status).toBe(204);
  expect((await send(admin.session, `${service}/grants`, "POST", grant)).status).toBe(204);
  expect((await readDossier(visible.id, secret)).status).toBe(200);
  expect((await send(admin.session, `${service}/grants`, "DELETE", grant)).status).toBe(204);
  expect((await send(admin.session, `${service}/grants`, "DELETE", grant)).status).toBe(204);
  expect(
    await db("administration_event")
      .whereLike("action", "api.grant.%")
      .orderBy("id")
      .pluck("action"),
  ).toEqual(["api.grant.created", "api.grant.revoked"]);
  expect((await readDossier(visible.id, secret)).status).toBe(404);
  expect((await send(admin.session, `${service}/grants`, "POST", grant)).status).toBe(204);

  const settings = await fetchAuthenticated(admin.session, `${ADMIN_BASE_URL}/integrations-api`);
  expect(settings.status).toBe(200);
  const html = await settings.text();
  expect(html).toContain(keyInput.label);
  expect(html).not.toContain(secret);
  await db("auth_user").where({ id: admin.id }).update({ active: false });
  expect((await readDossier(visible.id, secret)).status).toBe(200);
  const replacement = await createAccount("replacement@example.test", [
    "admin:access",
    "admin:api:manage",
  ]);
  expect((await send(replacement.session, service, "PATCH", { enabled: false })).status).toBe(204);
  expect((await readDossier(visible.id, secret)).status).toBe(401);
  expect(
    (await send(replacement.session, `${service}/keys`, "DELETE", { id: key.id })).status,
  ).toBe(204);
  expect((await send(replacement.session, service, "PATCH", { enabled: true })).status).toBe(204);
  expect((await readDossier(visible.id, secret)).status).toBe(401);
});
