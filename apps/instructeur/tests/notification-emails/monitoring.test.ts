import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  notificationFilters,
  notificationOverview,
} from "@pitchou/server/database/notification_monitoring.ts";
import { setup } from "./fixtures.ts";

test("admin search is paginated, literal, type/status/environment and Paris-date filtered", async () => {
  const { actor, recipient } = await setup();
  const [row] = await db("email_notification_outbox")
    .insert({
      personne: recipient.id,
      dossier: actor.dossier.id,
      kind: "novelty",
      batch_key: "dates",
      due_at: new Date("2026-10-21T22:30:00Z"),
      environment: "preview",
    })
    .returning("*");
  const params = new URLSearchParams({
    from: "2026-10-22",
    to: "2026-10-22",
    kind: "novelty",
    status: "pending",
    environment: "preview",
    search: row.id,
    notification: row.id,
  });
  const result = await notificationOverview(notificationFilters(params), db);
  expect(result.total).toBe(1);
  expect(result.rows[0].id).toBe(row.id);
  expect(result.counts).toEqual([{ kind: "novelty", status: "pending", count: 1 }]);
  expect(result.history.map((h) => h.event)).toEqual(["queued"]);
  expect(Object.keys(result.rows[0])).not.toContain("message");
  params.set("environment", "production");
  expect((await notificationOverview(notificationFilters(params), db)).total).toBe(0);
  expect(
    (await notificationOverview(notificationFilters(new URLSearchParams({ search: "%" })), db))
      .total,
  ).toBe(0);
  expect(
    (
      await notificationOverview(
        notificationFilters(new URLSearchParams({ search: "recipient@test.fr" })),
        db,
      )
    ).total,
  ).toBe(1);
});

test("overdue view selects pending daily queues, and pagination preserves deterministic order", async () => {
  const { actor, recipient } = await setup();
  for (let n = 0; n < 23; n++)
    await db("email_notification_outbox").insert({
      personne: recipient.id,
      dossier: actor.dossier.id,
      kind: "novelty",
      batch_key: `page${n}`,
      due_at: new Date(Date.now() - 60000),
    });
  await db("email_notification_outbox").insert({
    personne: recipient.id,
    dossier: actor.dossier.id,
    kind: "novelty",
    batch_key: "future",
    due_at: new Date(Date.now() + 86400000),
  });
  const first = await notificationOverview(
    notificationFilters(new URLSearchParams({ overdue: "1" })),
    db,
  );
  const second = await notificationOverview(
    notificationFilters(new URLSearchParams({ overdue: "1", page: "2" })),
    db,
  );
  expect(first.total).toBe(23);
  expect(first.rows).toHaveLength(20);
  expect(second.rows).toHaveLength(3);
  expect(new Set([...first.rows, ...second.rows].map((r) => r.id)).size).toBe(23);
});

test.each([
  "from=2026-02-31",
  "from=0000-01-01",
  "from=2026-12-01&to=2026-01-01",
  "page=0",
  "page=Infinity",
  "kind=sql",
  "status=failed",
  "dateField=message",
  "notification=invalid",
  "environment=unknown",
  "overdue=yes",
])("rejects malformed admin filters %s", (query) => {
  expect(() => notificationFilters(new URLSearchParams(query))).toThrow(RangeError);
});
