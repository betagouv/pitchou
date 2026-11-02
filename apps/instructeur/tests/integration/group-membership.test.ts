import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { connectUser, getSessionUser } from "@pitchou/server/users.ts";

function members(token: string, groupId: string, method: string, body: object, origin?: string) {
  return fetch(`${INTEGRATION_BASE_URL}/parametres/groupes/${groupId}/membres`, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `pitchou_session=${token}`,
      origin: origin ?? INTEGRATION_BASE_URL,
    },
    body: JSON.stringify(body),
  });
}

test("members prepare colleagues by email and ProConnect reuses the account without DN", async () => {
  const owner = await createInstructeurWithDossier(db);
  const response = await members(owner.cap, owner.groupeId, "POST", { email: " New@Example.org " });
  expect(response.status).toBe(200);
  const user = await db("auth_user").where({ email: "new@example.org" }).first();
  expect((await getSessionUser(user.id, db))?.permissions).toEqual([
    "dossier:read",
    "dossier:instruct",
  ]);
  expect(await db("user_groupe").where({ user_id: user.id }).pluck("groupe_instructeurs")).toEqual([
    owner.groupeId,
  ]);
  const login = await connectUser(
    {
      issuer: "https://proconnect.test",
      subject: "new",
      email: user.email,
      firstNames: "Camille",
      lastName: "Martin",
    },
    db,
  );
  expect(login.id).toBe(user.id);
  expect(await db("personne").where({ email: user.email })).toHaveLength(0);
  expect((await members(owner.cap, owner.groupeId, "POST", { email: user.email })).status).toBe(
    200,
  );
  expect(await db("administration_event").where({ action: "group_member_added" })).toHaveLength(1);
});

test("members see only their groups and cannot change someone else's group or routing", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Owner" });
  const foreign = await createInstructeurWithDossier(db, { nomGroupe: "Foreign" });
  const list = await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/parametres/groupes`);
  const groups = await list.json();
  expect(groups.map((g: { id: string }) => g.id)).toEqual([owner.groupeId]);
  expect(groups[0].members.map((m: { id: number }) => m.id)).toEqual([owner.id]);
  expect(groups[0].members[0]).not.toHaveProperty("proconnect_sub");
  expect(
    (await members(owner.cap, foreign.groupeId, "POST", { email: "stranger@example.org" })).status,
  ).toBe(403);
  expect(
    (await members(owner.cap, foreign.groupeId, "DELETE", { userId: foreign.id })).status,
  ).toBe(403);
  expect(
    (
      await members(owner.cap, owner.groupeId, "POST", {
        email: "stranger@example.org",
        departments: ["75"],
      })
    ).status,
  ).toBe(400);
  expect(await db("auth_user").where({ email: "stranger@example.org" })).toHaveLength(0);
  expect(await db("administration_event")).toHaveLength(0);
});

test("all active members can manage membership even with read-only dossier rights", async () => {
  const owner = await createInstructeurWithDossier(db);
  await db("auth_permission_exclusion").insert({
    user_id: owner.id,
    permission: "dossier:instruct",
  });
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: "reader@example.org" })).status,
  ).toBe(200);
  await db("auth_permission_exclusion").insert({ user_id: owner.id, permission: "dossier:read" });
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: "another@example.org" })).status,
  ).toBe(200);
  expect((await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status).toBe(
    403,
  );
});

test("existing accounts retain administrator restrictions and disabled accounts stay disabled", async () => {
  const owner = await createInstructeurWithDossier(db);
  const [existing] = await db("auth_user").insert({ email: "existing@example.org" }).returning("*");
  await db("auth_permission").insert({ user_id: existing.id, permission: "dossier:read" });
  await db("auth_permission_exclusion").insert({
    user_id: existing.id,
    permission: "dossier:instruct",
  });
  expect((await members(owner.cap, owner.groupeId, "POST", { email: existing.email })).status).toBe(
    200,
  );
  expect((await getSessionUser(existing.id, db))?.permissions).toEqual(["dossier:read"]);
  expect(await db("auth_permission_bundle").where({ user_id: existing.id })).toHaveLength(0);
  await db("auth_user").where({ id: existing.id }).update({ active: false });
  expect((await members(owner.cap, owner.groupeId, "POST", { email: existing.email })).status).toBe(
    409,
  );
  expect((await db("auth_user").where({ id: existing.id }).first()).active).toBe(false);
});

test("a last member can leave and immediately loses membership management and dossier access", async () => {
  const owner = await createInstructeurWithDossier(db);
  await db("edge_personne_follows_dossier").insert({
    personne: owner.id,
    dossier: owner.dossier.id,
  });
  expect((await members(owner.cap, owner.groupeId, "DELETE", { userId: owner.id })).status).toBe(
    200,
  );
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: "new@example.org" })).status,
  ).toBe(403);
  expect((await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status).toBe(
    403,
  );
  const list = await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/parametres/groupes`);
  expect(await list.json()).toEqual([]);
  expect(await db("auth_user").where({ id: owner.id })).toHaveLength(1);
  expect(await db("groupe_instructeurs").where({ id: owner.groupeId })).toHaveLength(1);
  expect(await db("administration_event").where({ action: "group_member_removed" })).toHaveLength(
    1,
  );
});

test("invalid input, foreign origins, archived groups and inactive sessions cannot mutate membership", async () => {
  const owner = await createInstructeurWithDossier(db);
  expect((await members(owner.cap, owner.groupeId, "POST", { email: "invalid" })).status).toBe(400);
  expect((await members(owner.cap, owner.groupeId, "DELETE", { userId: "1" })).status).toBe(400);
  expect((await members(owner.cap, owner.groupeId, "DELETE", { userId: 2147483648 })).status).toBe(
    400,
  );
  expect(
    (
      await members(
        owner.cap,
        owner.groupeId,
        "POST",
        { email: "new@example.org" },
        "https://foreign.test",
      )
    ).status,
  ).toBe(403);
  await db("groupe_instructeurs").where({ id: owner.groupeId }).update({ active: false });
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: "new@example.org" })).status,
  ).toBe(403);
  await db("auth_user").where({ id: owner.id }).update({ active: false });
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: "new@example.org" })).status,
  ).toBe(401);
  expect((await members("", owner.groupeId, "DELETE", { userId: owner.id })).status).toBe(401);
  expect(await db("administration_event")).toHaveLength(0);
});

test("a colleague who has already signed in receives membership on the same account", async () => {
  const owner = await createInstructeurWithDossier(db);
  const colleague = await connectUser(
    {
      issuer: "https://proconnect.test",
      subject: "returning",
      email: "returning@example.org",
      firstNames: "Alex",
      lastName: "Martin",
    },
    db,
  );
  expect((await getSessionUser(colleague.id, db))?.groupes).toEqual([]);
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: colleague.email })).status,
  ).toBe(200);
  const current = await getSessionUser(colleague.id, db);
  expect(current?.groupes.map((group) => group.id)).toEqual([owner.groupeId]);
  expect(current?.permissions).toContain("dossier:instruct");
  expect(await db("auth_user").where({ email: colleague.email })).toHaveLength(1);
});
