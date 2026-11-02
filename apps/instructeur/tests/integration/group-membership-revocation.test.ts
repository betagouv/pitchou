import { expect, test } from "vitest";
import type { UserId } from "@pitchou/types/permissions.ts";
import { saveUser } from "@pitchou/server/administration/users.ts";
import { addGroupMember, removeGroupMember } from "@pitchou/server/groupMembership.ts";
import { getSessionUser } from "@pitchou/server/users.ts";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { admin } from "../helpers/administration.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("adding an existing member cannot restore permissions removed by an administrator", async () => {
  const owner = await createInstructeurWithDossier(db);
  const administrator = await admin();
  await saveUser(administrator.id, {
    id: owner.id,
    email: owner.email,
    active: true,
    bundles: [],
    grants: [],
    exclusions: [],
  });
  const response = await fetchAuthenticated(
    owner.cap,
    `${INTEGRATION_BASE_URL}/parametres/groupes/${owner.groupeId}/membres`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: owner.email }),
    },
  );
  expect(response.status).toBe(200);
  expect((await getSessionUser(owner.id as UserId, db))?.permissions).toEqual([]);
  expect((await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status).toBe(
    403,
  );
});

test("a colleague cannot restore an empty administrator configuration by removing and adding a member", async () => {
  const owner = await createInstructeurWithDossier(db);
  const administrator = await admin();
  const user = await saveUser(administrator.id, {
    email: "restricted@example.org",
    active: true,
    bundles: [],
    grants: [],
    exclusions: [],
  });
  await addGroupMember(owner.id as UserId, owner.groupeId, user.email, db);
  await removeGroupMember(owner.id as UserId, owner.groupeId, user.id, db);
  await addGroupMember(owner.id as UserId, owner.groupeId, user.email, db);
  expect((await getSessionUser(user.id, db))?.permissions).toEqual([]);
});

test.each([
  ["auth_permission_bundle", "bundle", "instructeur"],
  ["auth_permission", "permission", "dossier:read"],
  ["auth_permission_exclusion", "permission", "dossier:instruct"],
])(
  "removing the last row in %s does not turn an account into an unconfigured account",
  async (table, column, value) => {
    const owner = await createInstructeurWithDossier(db);
    const [user] = await db("auth_user").insert({ email: "revoked@example.org" }).returning("*");
    await db(table).insert({ user_id: user.id, [column]: value });
    await db(table).where({ user_id: user.id }).delete();
    await addGroupMember(owner.id as UserId, owner.groupeId, user.email, db);
    expect((await getSessionUser(user.id, db))?.permissions).toEqual([]);
  },
);
