import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier, attachCapToGroupe } from "../factories/index.ts";
import { sessionUserId } from "../helpers/auth.ts";
import { GroupMembershipError, removeGroupMember } from "@pitchou/server/groupMembership.ts";

test("concurrent removals recheck the actor after taking the membership lock", async () => {
  const first = await createInstructeurWithDossier(db, { nomGroupe: "First" });
  const second = await createInstructeurWithDossier(db, { nomGroupe: "Second" });
  await attachCapToGroupe(db, second.cap, first.groupeId);
  const results = await Promise.allSettled([
    removeGroupMember(sessionUserId(first.cap), first.groupeId, sessionUserId(second.cap), db),
    removeGroupMember(sessionUserId(second.cap), first.groupeId, sessionUserId(first.cap), db),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason).toBeInstanceOf(GroupMembershipError);
  expect(rejected.reason.status).toBe(403);
  expect(await db("user_groupe").where({ groupe_instructeurs: first.groupeId })).toHaveLength(1);
  expect(
    await db("user_groupe").where({ user_id: second.id, groupe_instructeurs: second.groupeId }),
  ).toHaveLength(1);
  expect(await db("auth_user")).toHaveLength(2);
  expect(await db("administration_event").where({ action: "group_member_removed" })).toHaveLength(
    1,
  );
});
