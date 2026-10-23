import { expect, test } from "vitest";
import { saveUser } from "@pitchou/server/administration/users.ts";
import { POST } from "../../src/routes/parametres/notifications/+server.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { admin } from "../helpers/administration.ts";
import { expectDatabaseWaiter } from "../helpers/databaseLocks.ts";
import { db } from "../setup/db.ts";

const preferences = { assignment: false, novelty: false, arrival: false };
function savePreferences(userId: number) {
  return Promise.resolve(
    POST({
      locals: { user: { id: userId } },
      request: new Request("http://localhost/parametres/notifications", {
        method: "POST",
        body: JSON.stringify(preferences),
      }),
    } as Parameters<typeof POST>[0]),
  ).then(
    (response) => response.status,
    (error: unknown) => {
      if (error && typeof error === "object" && "status" in error) return error.status;
      throw error;
    },
  );
}

test("a preferences write queued behind deactivation rejects without changing preferences", async () => {
  const user = await createInstructeurWithDossier(db);
  const before = await db("email_notification_preferences").where({ personne: user.id }).first();
  const revocation = await db.transaction();
  let response: ReturnType<typeof savePreferences> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await revocation.raw("select pg_backend_pid() as pid");
    await revocation("email_notification_preferences")
      .where({ personne: user.id })
      .forUpdate()
      .first();
    await revocation("auth_user").where({ id: user.id }).update({ active: false });
    response = savePreferences(user.id);
    await expectDatabaseWaiter(pid, "%");
    await revocation.commit();
    expect(await response).toBe(403);
    expect(await db("email_notification_preferences").where({ personne: user.id }).first()).toEqual(
      before,
    );
  } finally {
    if (!revocation.isCompleted()) await revocation.rollback();
    await response;
  }
});

test("deactivation waits for an accepted preferences write, then further writes fail", async () => {
  const user = await createInstructeurWithDossier(db);
  const actor = await admin();
  const rowLock = await db.transaction();
  let response: ReturnType<typeof savePreferences> | undefined;
  let revocation: ReturnType<typeof saveUser> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await rowLock.raw("select pg_backend_pid() as pid");
    await rowLock("email_notification_preferences")
      .where({ personne: user.id })
      .forUpdate()
      .first();
    response = savePreferences(user.id);
    const writer = await expectDatabaseWaiter(pid, "%email_notification_preferences%for update%");
    revocation = saveUser(actor.id, {
      id: user.id,
      email: user.email,
      active: false,
      bundles: ["instructeur"],
      grants: [],
      exclusions: [],
    });
    await expectDatabaseWaiter(writer, "%pg_advisory_xact_lock%");
    await rowLock.commit();
    expect(await response).toBe(200);
    await revocation;
    expect(await savePreferences(user.id)).toBe(403);
    expect(
      await db("email_notification_preferences").where({ personne: user.id }).first(),
    ).toMatchObject(preferences);
    expect(await db("session").where({ user_id: user.id })).toEqual([]);
  } finally {
    if (!rowLock.isCompleted()) await rowLock.rollback();
    await response;
    await revocation;
  }
});
