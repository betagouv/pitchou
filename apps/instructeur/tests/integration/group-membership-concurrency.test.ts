import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier, attachCapToGroupe } from "../factories/index.ts";
import { allowGroupManagement } from "../helpers/groupMembership.ts";
import { sessionUserId } from "../helpers/auth.ts";
import {
  addGroupMember,
  GroupMembershipError,
  removeGroupMember,
} from "@pitchou/server/groupMembership.ts";

test("concurrent removals recheck the actor after taking the membership lock", async () => {
  const first = await createInstructeurWithDossier(db, { nomGroupe: "First" });
  const second = await createInstructeurWithDossier(db, { nomGroupe: "Second" });
  await attachCapToGroupe(db, second.cap, first.groupeId);
  await allowGroupManagement(db, first.id);
  await allowGroupManagement(db, second.id);
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

test.each(["admin:access", "groups:manage"])(
  "queued membership writes recheck revoked %s after acquiring the lock",
  async (permission) => {
    const owner = await createInstructeurWithDossier(db);
    await allowGroupManagement(db, owner.id);
    const blocker = await db.transaction();
    await blocker.raw("select pg_advisory_xact_lock(2105102026)");
    let signalLockAttempt!: () => void;
    const attempted = new Promise<void>((resolve) => {
      signalLockAttempt = resolve;
    });
    const onQuery = (query: { sql: string }) => {
      if (query.sql.includes("pg_advisory_xact_lock")) signalLockAttempt();
    };
    db.on("query", onQuery);
    const result = addGroupMember(
      sessionUserId(owner.cap),
      owner.groupeId,
      "queued@example.org",
      db,
    ).then(
      () => null,
      (cause: unknown) => cause,
    );
    try {
      await attempted;
      await blocker("auth_permission_exclusion").insert({ user_id: owner.id, permission });
      await blocker.commit();
      expect(await result).toMatchObject({ status: 403 });
      await expect(
        removeGroupMember(sessionUserId(owner.cap), owner.groupeId, sessionUserId(owner.cap), db),
      ).rejects.toMatchObject({ status: 403 });
      expect(await db("auth_user").where({ email: "queued@example.org" })).toHaveLength(0);
      expect(await db("user_groupe").where({ user_id: owner.id })).toHaveLength(1);
      expect(await db("administration_event")).toHaveLength(0);
    } finally {
      db.off("query", onQuery);
      if (!blocker.isCompleted()) await blocker.rollback();
      await result;
    }
  },
);
