import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  recordDossierCnpnEmailBrevoEvent,
  markDossierCnpnEmailSendAttemptSent,
} from "@pitchou/server/database/dossier_cnpn_email.ts";
import { completeFailureNotification } from "@pitchou/server/database/dossier_cnpn_email/failure.ts";
import { emailFilters, emailOverview } from "@pitchou/server/database/email_monitoring.ts";
import { setup } from "./fixtures.ts";

const reason = "552 5.3.4 Error: message file too big";

async function pendingEmail() {
  const { actor } = await setup();
  const id = randomUUID();
  await db("dossier_cnpn_email_sent_event").insert({
    id,
    dossier: actor.dossier.id,
    sent_by_email: "actor@test.fr",
    recipient_email: "cnpn@test.fr",
    subject: "Cernay",
    html_body: "<p>Bonjour</p>",
    payload_hash: "hash",
  });
  return {
    id,
    event: {
      type: "soft_bounce" as const,
      requestId: id,
      providerMessageId: "provider-id",
      recipientEmail: "cnpn@test.fr",
      occurredAt: new Date("2026-10-23T12:35:24Z"),
      reason,
    },
  };
}

test("reconciles an early bounce, exposes the failure and reason, and deduplicates concurrent alerts", async () => {
  const { id, event } = await pendingEmail();
  const record = () => db.transaction((trx) => recordDossierCnpnEmailBrevoEvent(event, trx));
  const results = await Promise.all([record(), record()]);
  const claimed = results.find((result) => result.matched && result.failureNotification);
  expect(claimed).toMatchObject({ matched: true, failureNotification: { eventId: id, reason } });
  expect(results.filter((result) => result.matched && result.failureNotification)).toHaveLength(1);
  expect(results).toContainEqual({ matched: true, retryFailureNotification: true });
  await markDossierCnpnEmailSendAttemptSent(id, event.providerMessageId, db);

  const filters = emailFilters(new URLSearchParams(`status=failed&email=cnpn:${id}`));
  const overview = await emailOverview(filters, db);
  expect(overview.total).toBe(1);
  expect(overview.rows[0]).toMatchObject({ status: "failed", last_error: reason });
  expect(overview.detail?.history).toContainEqual(
    expect.objectContaining({
      event: "soft_bounce",
      details: { reason },
      occurred_at: event.occurredAt,
    }),
  );

  if (!claimed?.matched || !claimed.failureNotification) throw new Error("Missing claim");
  const claimedAt = claimed.failureNotification.claimedAt;
  await completeFailureNotification(id, claimedAt, false, db);
  const retried = await record();
  if (!retried.matched || !retried.failureNotification) throw new Error("Missing retry claim");
  await completeFailureNotification(id, retried.failureNotification.claimedAt, true, db);
  expect(await record()).toEqual({ matched: true, retryFailureNotification: false });
});

test("ignores copies, retains the latest failure and accepts eventual delivery without repeating alerts", async () => {
  const { id, event } = await pendingEmail();
  const record = (changes = {}) =>
    db.transaction((trx) => recordDossierCnpnEmailBrevoEvent({ ...event, ...changes }, trx));
  await record({ recipientEmail: "copy@test.fr" });
  expect(await db("dossier_cnpn_email_sent_event").where({ id }).first()).toMatchObject({
    delivery_failed_at: null,
    failure_notification_claimed_at: null,
  });
  const result = await record();
  if (!result.matched || !result.failureNotification) throw new Error("Missing claim");
  await completeFailureNotification(id, result.failureNotification.claimedAt, true, db);
  await record({ occurredAt: new Date(+event.occurredAt - 1000), reason: "older" });
  expect(await db("dossier_cnpn_email_sent_event").where({ id }).first()).toMatchObject({
    delivery_failure_reason: reason,
  });
  await record({ type: "delivered", occurredAt: new Date(+event.occurredAt + 1000) });
  // A delayed duplicate of the bounce cannot turn confirmed delivery back into a failure.
  await record();
  const overview = await emailOverview(emailFilters(new URLSearchParams(`email=cnpn:${id}`)), db);
  expect(overview.rows[0].status).toBe("sent");
  expect(overview.cnpn.received).toBe(1);
  expect(overview.detail?.history.some((item) => item.event === "soft_bounce")).toBe(true);
});

test("does not resend a sender alert after an ambiguous attempt exceeds the deduplication window", async () => {
  const { id, event } = await pendingEmail();
  const record = () => db.transaction((trx) => recordDossierCnpnEmailBrevoEvent(event, trx));
  const result = await record();
  if (!result.matched || !result.failureNotification) throw new Error("Missing claim");
  await completeFailureNotification(id, result.failureNotification.claimedAt, false, db);
  await db("dossier_cnpn_email_sent_event")
    .where({ id })
    .update({ failure_notification_first_attempt_at: new Date(Date.now() - 26 * 60_000) });
  expect(await record()).toEqual({ matched: true, retryFailureNotification: false });
  expect(
    await db("dossier_cnpn_email_sent_event")
      .where({ id })
      .whereNotNull("failure_notification_uncertain_at"),
  ).toHaveLength(1);
});

test("definitive sender-alert rejection clears only that attempt's ambiguity anchor", async () => {
  const { id, event } = await pendingEmail();
  const record = () => db.transaction((trx) => recordDossierCnpnEmailBrevoEvent(event, trx));
  const result = await record();
  if (!result.matched || !result.failureNotification) throw new Error("Missing claim");
  await completeFailureNotification(id, result.failureNotification.claimedAt, false, db, true);
  expect(await db("dossier_cnpn_email_sent_event").where({ id }).first()).toMatchObject({
    failure_notification_first_attempt_at: null,
  });
  const retry = await record();
  if (!retry.matched || !retry.failureNotification) throw new Error("Missing retry claim");
  const earlierAmbiguous = new Date(Date.now() - 10 * 60_000);
  await db("dossier_cnpn_email_sent_event")
    .where({ id })
    .update({ failure_notification_first_attempt_at: earlierAmbiguous });
  await completeFailureNotification(id, retry.failureNotification.claimedAt, false, db, true);
  expect(await db("dossier_cnpn_email_sent_event").where({ id }).first()).toMatchObject({
    failure_notification_first_attempt_at: earlierAmbiguous,
  });
});

test("a replay at the cutoff keeps the active sender-alert claim so its success can commit", async () => {
  const { id, event } = await pendingEmail();
  const record = () => db.transaction((trx) => recordDossierCnpnEmailBrevoEvent(event, trx));
  const result = await record();
  if (!result.matched || !result.failureNotification) throw new Error("Missing claim");
  await db("dossier_cnpn_email_sent_event")
    .where({ id })
    .update({ failure_notification_first_attempt_at: new Date(Date.now() - 26 * 60_000) });
  expect(await record()).toEqual({ matched: true, retryFailureNotification: true });
  expect(await db("dossier_cnpn_email_sent_event").where({ id }).first()).toMatchObject({
    failure_notification_uncertain_at: null,
  });
  await completeFailureNotification(id, result.failureNotification.claimedAt, true, db);
  expect(
    await db("dossier_cnpn_email_sent_event")
      .where({ id })
      .whereNotNull("failure_notification_sent_at"),
  ).toHaveLength(1);
});

test("duplicate bounce cutoff and claim decisions hold a row lock against an ambiguous completion", async () => {
  const { id, event } = await pendingEmail();
  const first = await db.transaction((trx) => recordDossierCnpnEmailBrevoEvent(event, trx));
  if (!first.matched || !first.failureNotification) throw new Error("Missing claim");
  await db("dossier_cnpn_email_sent_event")
    .where({ id })
    .update({ failure_notification_first_attempt_at: new Date(Date.now() - 26 * 60_000) });
  const replay = await db.transaction();
  let completion: Promise<unknown> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await replay.raw("select pg_backend_pid() as pid");
    expect(await recordDossierCnpnEmailBrevoEvent(event, replay)).toEqual({
      matched: true,
      retryFailureNotification: true,
    });
    completion = completeFailureNotification(id, first.failureNotification.claimedAt, false, db);
    // The exact duplicate changes no delivery timestamp. The explicit lock still
    // serializes completion with both the cutoff check and the claim decision.
    await vi.waitFor(
      async () => {
        const { rows } = await db.raw(
          "select pid from pg_stat_activity where datname = current_database() and ? = any(pg_blocking_pids(pid))",
          [pid],
        );
        expect(rows.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  } finally {
    await replay.rollback();
    await completion;
  }
  expect(await db.transaction((trx) => recordDossierCnpnEmailBrevoEvent(event, trx))).toEqual({
    matched: true,
    retryFailureNotification: false,
  });
  expect(
    await db("dossier_cnpn_email_sent_event")
      .where({ id })
      .whereNotNull("failure_notification_uncertain_at"),
  ).toHaveLength(1);
});
