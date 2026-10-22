import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

function search(token: string, groupId: string, query = "") {
  return fetchAuthenticated(
    token,
    `${INTEGRATION_BASE_URL}/parametres/groupes/${groupId}/membres?q=${encodeURIComponent(query)}`,
  );
}

test("members search active users by name or email without exposing account details", async () => {
  const owner = await createInstructeurWithDossier(db);
  const [candidate] = await db("auth_user")
    .insert({
      email: "celine@example.org",
      first_names: "Céline",
      last_name: "Leroy",
    })
    .returning("id");
  await db("auth_user").insert({ email: "celine-disabled@example.org", active: false });
  for (const query of ["CELINE", "leroy cel", "celine@", "Céline"]) {
    const response = await search(owner.cap, owner.groupeId, query);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual([
      {
        id: candidate.id,
        email: "celine@example.org",
        first_names: "Céline",
        last_name: "Leroy",
      },
    ]);
  }
  await db("user_groupe").insert({ user_id: candidate.id, groupe_instructeurs: owner.groupeId });
  expect(await (await search(owner.cap, owner.groupeId, "celine")).json()).toEqual([]);
});

test("search is limited and treats SQL wildcard characters as literal text", async () => {
  const owner = await createInstructeurWithDossier(db);
  await db("auth_user").insert(
    Array.from({ length: 25 }, (_, i) => ({ email: `user${i}@example.org` })),
  );
  expect(await (await search(owner.cap, owner.groupeId)).json()).toHaveLength(20);
  for (const query of ["%", "_", "' OR 1=1 --", "\\"]) {
    expect(await (await search(owner.cap, owner.groupeId, query)).json()).toEqual([]);
  }
  expect((await search(owner.cap, owner.groupeId, "a".repeat(255))).status).toBe(400);
});

test("only current members of an active group can search for candidates", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Owner" });
  const foreign = await createInstructeurWithDossier(db, { nomGroupe: "Foreign" });
  expect((await search(owner.cap, foreign.groupeId)).status).toBe(403);
  expect((await search("invalid-session", owner.groupeId)).status).toBe(401);
  await db("user_groupe").where({ user_id: owner.id }).delete();
  expect((await search(owner.cap, owner.groupeId)).status).toBe(403);
  await db("groupe_instructeurs").where({ id: foreign.groupeId }).update({ active: false });
  expect((await search(foreign.cap, foreign.groupeId)).status).toBe(403);
});
