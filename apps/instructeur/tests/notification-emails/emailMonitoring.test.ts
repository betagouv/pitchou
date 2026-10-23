import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { emailFilters, emailOverview } from "@pitchou/server/database/email_monitoring.ts";
import { setup } from "./fixtures.ts";

const filters = (query = "") => emailFilters(new URLSearchParams(query));
async function mixed() {
  const { actor, recipient } = await setup();
  const id = randomUUID();
  const date = new Date("2026-10-21T22:30:00Z");
  await db("email_notification_outbox").insert({
    id,
    personne: recipient.id,
    dossier: actor.dossier.id,
    kind: "arrival",
    batch_key: "monitor",
    due_at: date,
    created_at: date,
    environment: "preview",
    message: {
      subject: "Notification figée",
      htmlContent: '<p>Bonjour <script>secret()</script><a href="javascript:alert(1)">lien</a></p>',
      to: ["frozen@test.fr"],
      headers: { secret: "private" },
    },
  });
  await db("dossier_cnpn_email_sent_event").insert({
    id,
    dossier: actor.dossier.id,
    sent_by: actor.id,
    sent_by_email: "actor@test.fr",
    recipient_email: "cnpn@test.fr",
    cc_emails: ["copy@test.fr"],
    subject: "Saisine <test>",
    html_body: '<p>Message <img src=x onerror="alert(1)"></p>',
    payload_hash: "private hash",
    status: "sent",
    created_at: date,
    sent_at: date,
    provider_message_id: "provider-cnpn",
    delivered_at: date,
    opened_at: new Date("2026-10-22T00:30:00Z"),
    attachment_names: ["saisine.pdf"],
  });
  return { id, actor, recipient };
}
test("counts and filters both sources in one snapshot, including Paris boundaries and existing tracking", async () => {
  const { id } = await mixed();
  const all = await emailOverview(filters("from=2026-10-22&to=2026-10-22"), db);
  expect(all.total).toBe(2);
  expect(all.counts).toEqual(
    expect.arrayContaining([
      { kind: "cnpn", status: "sent", count: 1 },
      { kind: "arrival", status: "pending", count: 1 },
    ]),
  );
  expect(all.cnpn).toEqual({ received: 1, opened: 1 });
  expect(all.rows.map((row) => row.source)).toEqual(["cnpn", "notification"]);
  expect((await emailOverview(filters(`search=${id}`), db)).total).toBe(2);
  expect(
    (await emailOverview(filters("source=cnpn&tracking=opened&environment=unrecorded"), db)).total,
  ).toBe(1);
  expect(
    (await emailOverview(filters("kind=arrival&environment=preview&overdue=1"), db)).total,
  ).toBe(1);
  expect((await emailOverview(filters("environment=production"), db)).total).toBe(0);
  expect((await emailOverview(filters("search=%"), db)).total).toBe(0);
  expect((await emailOverview(filters("from=2026-10-21&to=2026-10-21"), db)).total).toBe(0);
  expect((await emailOverview(filters("tracking=unconfirmed"), db)).total).toBe(0);
});
test("source-qualified details survive filters and distinguish identical IDs without exposing raw payloads", async () => {
  const { id } = await mixed();
  const notification = await emailOverview(filters(`search=no-match&email=notification:${id}`), db);
  expect(notification.total).toBe(0);
  expect(notification.detail?.row.subject).toBe("Notification figée");
  expect(notification.detail?.recipients).toEqual(["frozen@test.fr"]);
  expect(notification.detail?.history.map((e) => e.event)).toEqual(["queued"]);
  expect(notification.detail?.html).toContain("Bonjour");
  expect(JSON.stringify(notification)).not.toMatch(/secret|private|javascript:/u);
  const cnpn = (await emailOverview(filters(`email=cnpn:${id}`), db)).detail!;
  expect(cnpn.row.source).toBe("cnpn");
  expect(cnpn.row.attempt_count).toBeNull();
  expect(cnpn.row.environment).toBe("unrecorded");
  expect(cnpn.sentBy).toBe("actor@test.fr");
  expect(cnpn.cc).toEqual(["copy@test.fr"]);
  expect(cnpn.attachments).toEqual([{ id: null, name: "saisine.pdf" }]);
  expect(cnpn.history.map((e) => e.event)).toEqual(["created", "sent", "delivered", "opened"]);
  expect(cnpn.html).not.toMatch(/onerror|<img/u);
  expect((await emailOverview(filters(`email=cnpn:${randomUUID()}`), db)).detail).toBeNull();
});
test("global stable sorting and pagination interleave both sources without overlap, with nulls last", async () => {
  const { actor, recipient } = await mixed();
  for (let i = 0; i < 24; i++) {
    const date = new Date(Date.UTC(2026, 9, 23, 0, i));
    if (i % 2)
      await db("dossier_cnpn_email_sent_event").insert({
        id: randomUUID(),
        dossier: actor.dossier.id,
        sent_by_email: "actor@test.fr",
        recipient_email: `sort${i}@test.fr`,
        subject: `Sort ${i}`,
        html_body: "<p>Test</p>",
        payload_hash: "hash",
        created_at: date,
        status: "failed",
      });
    else
      await db("email_notification_outbox").insert({
        personne: recipient.id,
        dossier: actor.dossier.id,
        kind: "novelty",
        batch_key: `sort${i}`,
        due_at: date,
        created_at: date,
      });
  }
  const first = await emailOverview(filters("sort=created_at&order=desc"), db);
  const second = await emailOverview(filters("sort=created_at&order=desc&page=2"), db);
  expect(first.total).toBe(26);
  expect(first.rows).toHaveLength(20);
  expect(second.rows).toHaveLength(6);
  const rows = [...first.rows, ...second.rows];
  expect(new Set(rows.map((row) => `${row.source}:${row.id}`)).size).toBe(26);
  expect(rows.map((row) => +new Date(row.created_at))).toEqual(
    rows.map((row) => +new Date(row.created_at)).sort((a, b) => b - a),
  );
  expect(first.rows.slice(0, 4).map((row) => row.source)).toEqual([
    "cnpn",
    "notification",
    "cnpn",
    "notification",
  ]);
  expect((await emailOverview(filters("page=999"), db)).page).toBe(2);
  expect((await emailOverview(filters("status=failed&source=cnpn"), db)).total).toBe(12);
  const accepted = await emailOverview(filters("sort=sent_at&order=asc"), db);
  expect(accepted.rows[0].source).toBe("cnpn");
  expect(accepted.rows[0].sent_at).not.toBeNull();
});
