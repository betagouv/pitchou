import { expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { emailNotificationPreferencesForUser } from "@pitchou/server/database/email_notification_preferences.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import { getUtilisateursAARRI } from "@pitchou/server/database/utilisateursAARRI.ts";
import { setup, dispatch } from "./fixtures.ts";
import type { UserId } from "@pitchou/types/permissions.ts";

const metrics = (name: string) =>
  db("evenement_metrique").where({ evenement: `notificationEmail${name}` });

test("authenticated settings changes are atomic, private, timestamped and skip no-op saves", async () => {
  const { actor } = await setup();
  const values = { arrival: true, assignment: false, novelty: true };
  await Promise.all([
    emailNotificationPreferencesForUser(actor.id as UserId, values, db),
    emailNotificationPreferencesForUser(actor.id as UserId, values, db),
  ]);
  const events = await metrics("SettingsChanged");
  expect(events).toHaveLength(1);
  expect(events[0].personne).toBe(actor.id);
  expect(events[0].details).toMatchObject({
    personneId: actor.id,
    environment: "test",
    source: "user",
    changes: { assignment: { previous: true, new: false } },
  });
  expect(Object.keys(events[0].details.changes)).toEqual(["assignment"]);
  expect(new Date(events[0].details.occurredAt).getTime()).toBe(events[0].date.getTime());
  await expect(
    db.transaction(async (trx) => {
      await emailNotificationPreferencesForUser(
        actor.id as UserId,
        { ...values, novelty: false },
        trx,
      );
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(await metrics("SettingsChanged")).toHaveLength(1);
  expect(await emailNotificationPreferencesForUser(0 as UserId, values, db)).toBeUndefined();
  expect(await metrics("SettingsChanged")).toHaveLength(1);
  await db("email_notification_preferences")
    .where({ personne: actor.id })
    .update({ arrival: false });
  expect(await metrics("SettingsChanged")).toHaveLength(1);
  expect(
    await db("email_notification_settings_history").where({ personne: actor.id }),
  ).toHaveLength(2);
});

test("queue, claim, failure, retry and acceptance produce one event per real transition", async () => {
  const { action, recipient } = await setup();
  await action("avis_modifie");
  await action("enjeu_renseigne");
  const [row] = await db("email_notification_outbox");
  expect(await metrics("Queued").whereRaw("details->>'notificationId' = ?", [row.id])).toHaveLength(
    1,
  );
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("secret@example.fr API-KEY sensitive HTML"))
    .mockResolvedValue({ messageId: "provider-accepted-123" });
  await dispatch(row.due_at, send);
  await dispatch(new Date(row.due_at.getTime() + 60000), send);
  await dispatch(new Date(row.due_at.getTime() + 120000), send);
  const updated = await db("email_notification_outbox").where({ id: row.id }).first();
  expect(updated).toMatchObject({
    attempt_count: 2,
    status: "sent",
    provider_message_id: "provider-accepted-123",
    last_error: null,
  });
  const history = await db("email_notification_history")
    .where({ notification_id: row.id })
    .orderBy("occurred_at");
  expect(history.map((event) => event.event)).toEqual([
    "queued",
    "attempted",
    "failed",
    "attempted",
    "sent",
  ]);
  const failed = await metrics("Failed");
  expect(failed).toHaveLength(1);
  expect(failed[0].details).toMatchObject({
    notificationId: row.id,
    type: "novelty",
    attempt: 1,
    errorCategory: "unknown",
    source: "system",
    attribution: "recipient",
    recipientId: recipient.id,
  });
  expect((await metrics("Sent"))[0].details.providerMessageId).toBe("provider-accepted-123");
  const serialized = JSON.stringify(
    await db("evenement_metrique").whereLike("evenement", "notificationEmail%"),
  );
  for (const forbidden of [
    "@test.fr",
    "secret@example.fr",
    "API-KEY",
    "htmlContent",
    "cap=",
    "access_code",
  ])
    expect(serialized).not.toContain(forbidden);
  const users = await getUtilisateursAARRI(db);
  expect(users.find((p) => p.personneId === recipient.id)).toMatchObject({
    actionCount: 0,
    lastActivityDate: null,
  });
});

test("concurrent dispatch does not duplicate attempts or lifecycle analytics", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  const send = vi.fn().mockResolvedValue({ messageId: "local-test" });
  await Promise.all([dispatch(row.due_at, send), dispatch(row.due_at, send)]);
  expect(send).toHaveBeenCalledOnce();
  expect(await metrics("Sent")).toHaveLength(1);
  expect((await db("email_notification_outbox").first()).attempt_count).toBe(1);
});

test("uncertain attempts are recorded without pretending provider acceptance", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await dispatch(row.due_at, vi.fn().mockRejectedValue(new Error("timeout")));
  await dispatch(new Date(row.due_at.getTime() + 26 * 60000));
  expect(await metrics("Sent")).toHaveLength(0);
  expect(await metrics("Uncertain")).toHaveLength(1);
  expect((await db("email_notification_outbox").first()).attempt_count).toBe(1);
});

test("rolled back queue inserts do not leave history or metrics", async () => {
  const { actor, recipient } = await setup();
  const before = await metrics("Queued");
  await expect(
    db.transaction(async (trx) => {
      await trx("email_notification_outbox").insert({
        personne: recipient.id,
        dossier: actor.dossier.id,
        kind: "novelty",
        batch_key: "rollback",
        due_at: new Date(),
      });
      throw new Error("rollback");
    }),
  ).rejects.toThrow();
  expect(await metrics("Queued")).toEqual(before);
});

// All failure paths use the same dispatcher; no real network requests are made.
test("preview environment is persisted and emitted without fabricating a user action", async () => {
  const { actor, recipient } = await setup();
  const [row] = await db("email_notification_outbox")
    .insert({
      personne: recipient.id,
      dossier: actor.dossier.id,
      kind: "novelty",
      batch_key: "preview",
      due_at: new Date(),
      environment: "preview",
    })
    .returning("*");
  await dispatchDossierNotificationEmails({
    db,
    dossier: row.dossier,
    kind: "novelty",
    send: vi.fn().mockResolvedValue({ messageId: "mailpit-id" }),
    siteUrl: "https://pitchou.test",
  });
  expect((await metrics("Sent"))[0].details).toMatchObject({
    environment: "preview",
    source: "system",
    attribution: "recipient",
  });
});
