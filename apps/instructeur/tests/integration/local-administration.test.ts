import { expect, test } from "vitest";
import { connectUser, getSessionUser } from "@pitchou/server/users.ts";
import { readSession } from "@pitchou/server/session.ts";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { ADMIN_BASE_URL, INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated, sessionUserId } from "../helpers/auth.ts";

import { admin, saveGroup } from "../helpers/administration.ts";
test("a new ProConnect identity is recorded without granting dossier permissions", async () => {
  const identity = {
    issuer: "https://proconnect.test",
    subject: "new",
    email: "new@test.fr",
    firstNames: "New",
    lastName: "User",
  };
  const user = await connectUser(identity, db);
  expect(user.first_login_at).toBeInstanceOf(Date);
  expect((await getSessionUser(user.id, db))?.permissions).toEqual([]);
  expect(await db("personne").where({ email: identity.email })).toHaveLength(0);
  const next = await connectUser({ ...identity, email: "changed@test.fr" }, db);
  expect(next.id).toBe(user.id);
  expect(await db("auth_user")).toHaveLength(1);
});

test("prepared accounts retain grants on first connection and reject a second identity claiming their email", async () => {
  const [invited] = await db("auth_user").insert({ email: "invited@test.fr" }).returning("*");
  await db("auth_permission_bundle").insert({ user_id: invited.id, bundle: "instructeur" });
  const identity = {
    issuer: "https://proconnect.test",
    subject: "invited",
    email: "INVITED@test.fr",
    firstNames: "",
    lastName: "",
  };
  expect((await connectUser(identity, db)).id).toBe(invited.id);
  expect((await getSessionUser(invited.id, db))?.permissions).toContain("dossier:read");
  await expect(connectUser({ ...identity, subject: "someone-else" }, db)).rejects.toThrow(
    "autre identité",
  );
});

test("permission exclusions and account deactivation take effect on an existing session", async () => {
  const instructor = await createInstructeurWithDossier(db);
  await db("edge_personne_follows_dossier").insert({
    personne: instructor.id,
    dossier: instructor.dossier.id,
  });
  await db("auth_permission_exclusion").insert({
    user_id: instructor.id,
    permission: "dossier:instruct",
  });
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
  const response = await fetchAuthenticated(
    instructor.cap,
    `${INTEGRATION_BASE_URL}/dossier/${instructor.dossier.id}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enjeu: "fort" }),
    },
  );
  expect(response.status).toBe(403);
  expect((await readSession(instructor.cap, db))?.permissions).not.toContain("dossier:instruct");
  await db("auth_user")
    .where({ id: sessionUserId(instructor.cap) })
    .update({ active: false });
  expect(await readSession(instructor.cap, db)).toBeNull();
  expect(
    (await fetchAuthenticated(instructor.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status,
  ).toBe(401);
});

test("admin endpoints enforce permissions and reject cross-origin mutations", async () => {
  const instructor = await createInstructeurWithDossier(db);
  expect(
    (
      await saveGroup(instructor.cap, {
        name: "Forbidden",
        active: true,
        departments: [],
        members: [],
      })
    ).status,
  ).toBe(403);
  const administrator = await admin();
  const response = await fetch(`${ADMIN_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      cookie: `pitchou_session=${administrator.token}`,
      origin: "https://untrusted.test",
      "content-type": "application/json",
    },
    body: "{}",
  });
  expect(response.status).toBe(403);
  expect(await db("groupe_instructeurs").where({ name: "Forbidden" })).toHaveLength(0);
});

test("historical accounts without email can change permissions and status while their email stays immutable", async () => {
  const administrator = await admin();
  const [historical] = await db("auth_user").insert({ email: null, active: true }).returning("*");
  const save = (overrides: object = {}) =>
    fetchAuthenticated(administrator.token, `${ADMIN_BASE_URL}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: historical.id,
        email: "",
        active: true,
        bundles: ["instructeur"],
        grants: ["admin:access"],
        exclusions: ["dossier:instruct"],
        ...overrides,
      }),
    });
  expect((await save()).status).toBe(200);
  expect(
    await db("auth_permission_bundle").where({ user_id: historical.id }).pluck("bundle"),
  ).toEqual(["instructeur"]);
  expect(await db("auth_permission").where({ user_id: historical.id }).pluck("permission")).toEqual(
    ["admin:access"],
  );
  expect(
    await db("auth_permission_exclusion").where({ user_id: historical.id }).pluck("permission"),
  ).toEqual(["dossier:instruct"]);
  expect((await save({ active: false })).status).toBe(200);
  expect(await db("auth_user").where({ id: historical.id }).first()).toMatchObject({
    active: false,
    email: null,
  });
  expect((await save({ email: "replacement@test.fr" })).status).toBe(400);
  expect((await save({ id: undefined })).status).toBe(400);
  expect((await save({ id: undefined, email: "invalid" })).status).toBe(400);
  expect(await db("auth_user").where({ id: historical.id }).first()).toMatchObject({
    active: false,
    email: null,
  });
});
