import { expect, test } from "vitest";
import { createSession } from "@pitchou/server/session.ts";
import { dossierInternalScope, dossierReadScope } from "@pitchou/types/externalApi.ts";
import { createDossier } from "../factories/dossier.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { db } from "../setup/db.ts";
import { ADMIN_BASE_URL, INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("a global grant covers existing and new dossiers with the key's read level until revoked", async () => {
  const email = "integration-admin@example.test";
  const [user] = await db("auth_user").insert({ email, active: true }).returning("id");
  await db("auth_permission").insert([
    { user_id: user.id, permission: "admin:access" },
    { user_id: user.id, permission: "admin:api:manage" },
  ]);
  const session = await createSession({ userId: user.id, email, name: "Test", idToken: null }, db);
  const integrations = `${ADMIN_BASE_URL}/api/integrations-api`;
  const api = `${INTEGRATION_BASE_URL}/api/v1`;
  const original = await createDossier(db);

  function send(url: string, method: "POST" | "DELETE", body: object) {
    return fetchAuthenticated(session, url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  }

  const created = await send(integrations, "POST", { name: "GeoMCE" });
  expect(created.status).toBe(201);
  const { id } = await created.json();
  const service = `${integrations}/${id}`;
  const grants = `${service}/grants`;

  async function issueKey(scopes: string[]) {
    const response = await send(`${service}/keys`, "POST", { label: "Test", scopes, days: 180 });
    expect(response.status).toBe(201);
    const { secret } = await response.json();
    return (path: string) => fetch(api + path, { headers: { Authorization: `Bearer ${secret}` } });
  }
  const read = await issueKey([dossierReadScope]);
  const readInternal = await issueKey([dossierReadScope, dossierInternalScope]);

  const basicGrant = { allDossiers: true, scope: dossierReadScope };
  const internalGrant = { allDossiers: true, scope: dossierInternalScope };
  expect((await send(grants, "POST", { scope: dossierReadScope })).status).toBe(400);
  expect((await send(grants, "POST", { ...basicGrant, allDossiers: false })).status).toBe(400);
  expect((await send(grants, "POST", { ...basicGrant, dossierId: original.id })).status).toBe(400);
  expect((await read(`/dossiers/${original.id}`)).status).toBe(404);

  expect((await send(grants, "POST", basicGrant)).status).toBe(204);
  expect((await send(grants, "POST", basicGrant)).status).toBe(204);
  const later = await createDossier(db);
  const list = await read("/dossiers");
  expect(list.status).toBe(200);
  expect((await list.json()).dossiers.map(({ id }: { id: number }) => id)).toEqual([
    original.id,
    later.id,
  ]);
  const path = `/dossiers/${later.id}`;
  expect(await (await readInternal(path)).json()).toMatchObject({ access: "restricted" });

  expect((await send(grants, "POST", internalGrant)).status).toBe(204);
  expect(await (await read(path)).json()).toMatchObject({ access: "restricted" });
  expect(await (await readInternal(path)).json()).toMatchObject({ access: "full_read" });

  const settings = await fetchAuthenticated(session, `${ADMIN_BASE_URL}/integrations-api`);
  expect(settings.status).toBe(200);
  expect(await settings.text()).toContain("Tous les dossiers");

  expect((await send(grants, "DELETE", internalGrant)).status).toBe(204);
  expect(await (await readInternal(path)).json()).toMatchObject({ access: "restricted" });
  expect((await send(grants, "DELETE", basicGrant)).status).toBe(204);
  expect((await read(path)).status).toBe(404);
  expect(
    await db("administration_event")
      .whereLike("action", "api.grant.%")
      .orderBy("id")
      .pluck("action"),
  ).toEqual(["api.grant.created", "api.grant.created", "api.grant.revoked", "api.grant.revoked"]);
});
