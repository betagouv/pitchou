import type { Knex } from "knex";
import type { EmailFilters } from "@pitchou/types/adminEmails.ts";
import { latestNotificationDeliveryIssues } from "./issues.ts";

// Project both sources before filtering, sorting, counting or paginating.
// CNPN has no environment or attempt counter. NULL must not imply production or one attempt.
export function emailRows(db: Knex.Transaction) {
  const notifications = db("email_notification_outbox as n")
    .leftJoin("dossier as d", "d.id", "n.dossier")
    .leftJoin("auth_user as p", "p.id", "n.personne")
    .leftJoin(latestNotificationDeliveryIssues(db).as("delivery_issue"), function () {
      this.on("delivery_issue.provider_message_id", "n.provider_message_id")
        .andOn("delivery_issue.recipient", db.raw("coalesce(n.message->'to'->>0, p.email)"))
        .andOn("delivery_issue.environment", db.raw("'pitchou-env-' || n.environment"));
    })
    .select(
      db.raw("'notification'::text as source"),
      "n.id",
      "n.kind",
      db.raw("CASE WHEN delivery_issue.id IS NOT NULL THEN 'failed' ELSE n.status END as status"),
      "n.environment",
      "n.dossier",
      "d.name as dossier_name",
      "n.personne",
      "p.first_names",
      "p.last_name",
      db.raw("coalesce(n.message->'to'->>0, p.email) as email"),
      "n.due_at",
      "n.sent_at",
      "n.created_at",
      "n.retry_at",
      "n.attempt_count",
      db.raw("coalesce(delivery_issue.reason, n.last_error) as last_error"),
      "n.cancellation_reason",
      "n.provider_message_id",
      db.raw(
        "n.message->>'subject' as subject, NULL::timestamptz as delivered_at, NULL::timestamptz as opened_at",
      ),
    );
  const cnpn = db("dossier_cnpn_email_sent_event as c")
    .leftJoin("dossier as d", "d.id", "c.dossier")
    .select(
      db.raw("'cnpn'::text as source"),
      "c.id",
      db.raw("'cnpn'::text as kind"),
      db.raw(`CASE WHEN c.delivery_failed_at IS NOT NULL AND c.delivered_at IS NULL
        AND c.opened_at IS NULL THEN 'failed' ELSE c.status END as status`),
      db.raw("'unrecorded'::text as environment"),
      "c.dossier",
      "d.name as dossier_name",
      db.raw("NULL::integer as personne, NULL::text as first_names, NULL::text as last_name"),
      "c.recipient_email as email",
      "c.created_at as due_at",
      "c.sent_at",
      "c.created_at",
      db.raw(
        "NULL::timestamptz as retry_at, NULL::integer as attempt_count, c.delivery_failure_reason as last_error, NULL::text as cancellation_reason",
      ),
      "c.provider_message_id",
      "c.subject",
      "c.delivered_at",
      "c.opened_at",
    );
  return db.unionAll([notifications, cnpn], true);
}
export function emailQuery(filters: EmailFilters, db: Knex.Transaction) {
  const base = db.from(emailRows(db).as("m"));
  for (const field of ["kind", "status", "environment", "source"] as const)
    if (filters[field]) base.where(`m.${field}`, filters[field]);
  const column = `m.${filters.dateField}`;
  if (filters.dateFrom)
    base.whereRaw("?? >= (?::date::timestamp AT TIME ZONE 'Europe/Paris')", [
      column,
      filters.dateFrom,
    ]);
  if (filters.dateTo)
    base.whereRaw("?? < ((?::date + 1)::timestamp AT TIME ZONE 'Europe/Paris')", [
      column,
      filters.dateTo,
    ]);
  if (filters.overdue)
    base
      .where("m.source", "notification")
      .where("m.status", "pending")
      .where("m.due_at", "<", db.fn.now());
  if (filters.tracking) {
    base.where("m.source", "cnpn").where("m.status", "sent");
    if (filters.tracking === "received") base.whereNotNull("m.delivered_at");
    if (filters.tracking === "opened") base.whereNotNull("m.opened_at");
    if (filters.tracking === "unconfirmed")
      base.whereNull("m.delivered_at").whereNull("m.opened_at");
  }
  if (filters.search) {
    const pattern = `%${filters.search.replaceAll(/[\\%_]/gu, "\\$&")}%`;
    base.where((q) => {
      for (const field of [
        "id",
        "dossier",
        "personne",
        "dossier_name",
        "email",
        "first_names",
        "last_name",
        "subject",
      ])
        q.orWhereRaw("??::text ILIKE ? ESCAPE '\\'", [`m.${field}`, pattern]);
    });
  }
  return base;
}
