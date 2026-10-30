import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { emailFilters, emailOverview } from "@pitchou/server/database/email_monitoring.ts";
import { setup } from "./fixtures.ts";

const filters = (query = "") => emailFilters(new URLSearchParams(query));
const acceptedAt = new Date("2026-10-28T15:51:56Z");
const failedAt = "2026-10-28T15:51:59.000Z";

async function acceptedNotification() {
  const { actor, recipient } = await setup();
  const [row] = await db("email_notification_outbox")
    .insert({
      personne: recipient.id,
      dossier: actor.dossier.id,
      kind: "arrival",
      batch_key: randomUUID(),
      due_at: acceptedAt,
      created_at: acceptedAt,
      sent_at: acceptedAt,
      status: "pending",
      attempt_count: 1,
      provider_message_id: randomUUID(),
      environment: "production",
      message: { subject: "Nouveau dossier", to: ["old@test.fr"], htmlContent: "<p>Bonjour</p>" },
    })
    .returning("*");
  await db("email_notification_outbox").where({ id: row.id }).update({ status: "sent" });
  await db("email_notification_history")
    .where({ notification_id: row.id })
    .update({
      occurred_at: db.raw(
        "CASE WHEN event = 'queued' THEN ?::timestamptz - interval '1 second' ELSE ?::timestamptz END",
        [acceptedAt, acceptedAt],
      ),
    });
  return row;
}

async function issue(row: { provider_message_id: string }, overrides = {}, sent = true) {
  await db("email_issue_notification").insert({
    id: randomUUID(),
    sent_at: sent ? new Date() : null,
    issue: {
      type: "hard_bounce",
      recipient: "old@test.fr",
      environment: "pitchou-env-production",
      providerMessageId: row.provider_message_id,
      reason: '554 5.7.1 Recipient address rejected: 511 "User Unknown"',
      occurredAt: failedAt,
      ...overrides,
    },
  });
}

test.each(["soft_bounce", "hard_bounce", "blocked", "invalid_email", "error"])(
  "exposes existing %s in counts, filters and chronological details without mutating dispatch state",
  async (type) => {
    const row = await acceptedNotification();
    const before = await db("email_notification_outbox").where({ id: row.id }).first();
    // A later account address or an unsent technical alert must not hide the failure.
    await db("auth_user").where({ id: row.personne }).update({ email: "new@test.fr" });
    await issue(row, { type }, false);
    const result = await emailOverview(
      filters(`status=failed&source=notification&kind=arrival&email=notification:${row.id}`),
      db,
    );
    expect(result.total).toBe(1);
    expect(result.counts).toEqual([{ kind: "arrival", status: "failed", count: 1 }]);
    expect(result.rows[0]).toMatchObject({
      status: "failed",
      email: "old@test.fr",
      attempt_count: 1,
      last_error: '554 5.7.1 Recipient address rejected: 511 "User Unknown"',
    });
    expect((await emailOverview(filters("status=sent"), db)).total).toBe(0);
    expect(result.detail?.history.map((e) => e.event)).toEqual(["queued", "sent", type]);
    expect(result.detail?.history.at(-1)).toMatchObject({
      occurred_at: failedAt,
      attempt: 0,
      details: { reason: result.rows[0].last_error, providerMessageId: row.provider_message_id },
    });
    expect(result.detail?.recipients).toEqual(["old@test.fr"]);
    expect(result.detail?.html).toContain("Bonjour");
    expect(await db("email_notification_outbox").where({ id: row.id }).first()).toEqual(before);
    expect(
      await db("email_notification_history").where({ notification_id: row.id }).pluck("event"),
    ).toEqual(["queued", "sent"]);
  },
);

test("ignores other recipients, environments, message IDs, API errors and successful events", async () => {
  const row = await acceptedNotification();
  await issue(row, { recipient: "other@test.fr" });
  await issue(row, { environment: "pitchou-env-staging" });
  await issue(row, { providerMessageId: "other-message" });
  await issue(row, { type: "send_error" });
  await issue(row, { type: "delivered" });
  const result = await emailOverview(filters(`email=notification:${row.id}`), db);
  expect(result.total).toBe(1);
  expect(result.rows[0]).toMatchObject({ status: "sent", last_error: null });
  expect(result.detail?.history.map((e) => e.event)).toEqual(["queued", "sent"]);
  expect((await emailOverview(filters("status=failed"), db)).total).toBe(0);
});

test("keeps one mail per result and uses the latest recorded reason across pagination", async () => {
  const row = await acceptedNotification();
  await issue(row, { type: "soft_bounce", occurredAt: "2026-10-28T15:51:57.000Z" });
  await issue(row, { type: "blocked", reason: "blocked : due to blacklist user" });
  const copies = Array.from({ length: 20 }, () => ({
    personne: row.personne,
    dossier: row.dossier,
    kind: "arrival",
    status: "sent",
    batch_key: randomUUID(),
    due_at: acceptedAt,
    sent_at: acceptedAt,
    provider_message_id: randomUUID(),
    environment: "production",
    message: row.message,
  }));
  const rows = await db("email_notification_outbox").insert(copies).returning("*");
  for (const copy of rows) await issue(copy);
  const first = await emailOverview(filters(`status=failed&email=notification:${row.id}`), db);
  const second = await emailOverview(filters("status=failed&page=2"), db);
  expect(first.total).toBe(21);
  expect(first.counts).toEqual([{ kind: "arrival", status: "failed", count: 21 }]);
  expect(first.rows).toHaveLength(20);
  expect(second.rows).toHaveLength(1);
  expect(new Set([...first.rows, ...second.rows].map((r) => r.id)).size).toBe(21);
  expect(first.detail?.row.last_error).toBe("blocked : due to blacklist user");
  expect(first.detail?.history.map((e) => e.event)).toEqual([
    "queued",
    "sent",
    "soft_bounce",
    "blocked",
  ]);
});
