import { baselineSeedNotifications } from "../../../../libs/database/seeds/dev/dossier/notifications.ts";
import { suppressNotification } from "@pitchou/server/dossierNotificationEmails/suppression.ts";
import { afterEach, expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { StagingEmailSuppressedError } from "@pitchou/server/emails/recipients.ts";
import {
  notificationFilters,
  notificationOverview,
} from "@pitchou/server/database/notification_monitoring.ts";
import { setup, dispatch } from "./fixtures.ts";
import { setupArrival } from "./arrivalFixtures.ts";

afterEach(() => vi.unstubAllEnvs());

test.each(["arrival", "assignment", "novelty"])(
  "suppresses %s once without sending, attempting or retrying",
  async (kind) => {
    const { actor, recipient } = await setup();
    const [row] = await db("email_notification_outbox")
      .insert({
        personne: recipient.id,
        dossier: actor.dossier.id,
        kind,
        batch_key: "staging",
        due_at: new Date(),
      })
      .returning("*");
    // A valid arrival revision is required by the recipient access checks.
    if (kind === "arrival") {
      const arrival = await db("email_notification_groupe_arrival")
        .where({ dossier: actor.dossier.id })
        .first();
      await db("email_notification_outbox")
        .where({ id: row.id })
        .update({ batch_key: arrival.revision });
    }
    vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
    vi.stubEnv("STAGING_EMAIL_ALLOWLIST", "");
    const result = await dispatch(row.due_at);
    expect(result.send).not.toHaveBeenCalled();
    expect(await db("email_notification_outbox").where({ id: row.id }).first()).toMatchObject({
      status: "suppressed",
      attempt_count: 0,
      retry_at: null,
      claimed_at: null,
      sent_at: null,
      provider_message_id: null,
      cancellation_reason: "staging_allowlist",
    });
    expect((await dispatch(new Date(row.due_at.getTime() + 86400000))).send).not.toHaveBeenCalled();
    vi.stubEnv("STAGING_EMAIL_ALLOWLIST", recipient.email);
    expect((await dispatch(new Date(row.due_at.getTime() + 86400000))).send).not.toHaveBeenCalled();
    const events = await db("email_notification_history")
      .where({ notification_id: row.id })
      .orderBy("occurred_at");
    expect(events.map((event) => event.event)).toEqual(["queued", "suppressed"]);
    const overview = await notificationOverview(
      notificationFilters(new URLSearchParams({ status: "suppressed" })),
      db,
    );
    expect(overview.rows.map((row) => row.id)).toEqual([row.id]);
  },
);

test("explicit opt-in allows a notification", async () => {
  const { action, recipient } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", recipient.email.toUpperCase());
  expect((await dispatch(row.due_at)).send).toHaveBeenCalledOnce();
});

test("frozen retry recipients cannot bypass a reduced allowlist", async () => {
  const { action, recipient } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await dispatch(row.due_at, vi.fn().mockRejectedValue(new Error("timeout")));
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", "new-address@example.com");
  await db("personne").where({ id: recipient.id }).update({ email: "new-address@example.com" });
  expect((await dispatch(new Date(row.due_at.getTime() + 60000))).send).not.toHaveBeenCalled();
  expect((await db("email_notification_outbox").first()).status).toBe("suppressed");
});

test("a sender-side suppression never becomes a provider failure or a sent event", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await dispatch(row.due_at, vi.fn().mockRejectedValue(new StagingEmailSuppressedError()));
  expect(await db("email_notification_outbox").where({ id: row.id }).first()).toMatchObject({
    status: "suppressed",
    retry_at: null,
    sent_at: null,
  });
});

test("concurrent suppression writes one matching history and metric event", async () => {
  const { action, recipient, actor } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await Promise.all([suppressNotification(db, row.id), suppressNotification(db, row.id)]);
  const events = await db("email_notification_history").where({
    notification_id: row.id,
    event: "suppressed",
  });
  expect(events).toHaveLength(1);
  expect(events[0].details).toMatchObject({
    notificationId: row.id,
    recipientId: recipient.id,
    dossierId: actor.dossier.id,
    reason: "staging_allowlist",
    source: "system",
    attribution: "recipient",
  });
  expect(await db("evenement_metrique").where({ id: events[0].id }).first()).toMatchObject({
    evenement: "notificationEmailSuppressed",
    details: events[0].details,
    date: events[0].occurred_at,
  });
});

test("an audit failure rolls back the suppressed state and history together", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await db.transaction(async (trx) => {
    // Deliberately reject the metric to verify the application's transaction.
    await trx.raw(`ALTER TABLE evenement_metrique ADD CONSTRAINT reject_suppression_test
      CHECK (evenement <> 'notificationEmailSuppressed') NOT VALID`);
    await expect(suppressNotification(trx, row.id)).rejects.toThrow("reject_suppression_test");
    expect(await trx("email_notification_outbox").where({ id: row.id }).first()).toMatchObject({
      status: "pending",
      cancellation_reason: null,
    });
    expect(await trx("email_notification_history").where({ notification_id: row.id })).toHaveLength(
      1,
    );
    await trx.raw("ALTER TABLE evenement_metrique DROP CONSTRAINT reject_suppression_test");
  });
});

test("seed transactions skip emails while recording group routing and normal activity resumes afterward", async () => {
  const { dossier, member, colleague } = await setupArrival();
  await db.transaction(async (trx) => {
    await trx("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: member.groupeId,
    });
    await trx("edge_personne_follows_dossier").insert({
      dossier: dossier.id,
      personne: colleague.id,
    });
    await trx("action_dossier").insert({
      dossier: dossier.id,
      type: "avis_modifie",
      author_personne: member.id,
    });
    await baselineSeedNotifications(trx, [dossier.id]);
  });
  expect(await db("email_notification_outbox")).toHaveLength(0);
  expect(await db("email_notification_groupe_arrival").where({ dossier: dossier.id })).toHaveLength(
    1,
  );
  await db("action_dossier").insert({
    dossier: dossier.id,
    type: "avis_modifie",
    author_personne: member.id,
  });
  expect(await db("email_notification_outbox")).toHaveLength(1);
});
