import type { Knex } from "knex";
import type { EmailDetail, EmailRow } from "@pitchou/types/adminEmails.ts";
import { emailPreviewHtml } from "./preview.ts";
import { emailRows } from "./query.ts";
import { notificationDeliveryIssues } from "./issues.ts";
import type { NotificationHistoryRow } from "@pitchou/types/emailNotifications.ts";

export async function emailDetail(key: string, db: Knex.Transaction): Promise<EmailDetail | null> {
  const [source, id] = key.split(":");
  const row = await db
    .from(emailRows(db).as("m"))
    .where({ "m.source": source, "m.id": id })
    .first<EmailRow>();
  if (!row) return null;
  if (source === "notification") return notificationDetail(row, db);
  return cnpnDetail(row, db);
}

async function notificationDetail(row: EmailRow, db: Knex.Transaction): Promise<EmailDetail> {
  const { id } = row;
  const stored = await db("email_notification_outbox")
    .where({ id })
    .first("message", "first_attempt_at");
  const message = stored.message;
  const history: NotificationHistoryRow[] = await db("email_notification_history")
    .where({ notification_id: id })
    .orderBy("occurred_at")
    .orderBy("id");
  const issues = await notificationDeliveryIssues(db, row).select("i.id", "i.issue");
  for (const { id: issueId, issue } of issues) {
    history.push({
      id: `issue:${issueId}`,
      notification_id: id,
      event: issue.type,
      environment: row.environment,
      occurred_at: issue.occurredAt,
      attempt: 0,
      details: { reason: issue.reason, providerMessageId: issue.providerMessageId },
    });
  }
  history.sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));
  return {
    row,
    history,
    html: typeof message?.htmlContent === "string" ? emailPreviewHtml(message.htmlContent) : null,
    recipients: Array.isArray(message?.to)
      ? message.to.filter((v: unknown) => typeof v === "string")
      : row.email
        ? [row.email]
        : [],
    cc: [],
    sentBy: null,
    attachments: [],
    firstAttemptAt: stored.first_attempt_at,
    readReceiptSentAt: null,
  };
}

async function cnpnDetail(row: EmailRow, db: Knex.Transaction): Promise<EmailDetail> {
  const { id } = row;
  const stored = await db("dossier_cnpn_email_sent_event")
    .where({ id })
    .first(
      "html_body",
      "sent_by_email",
      "cc_emails",
      "attachment_ids",
      "attachment_names",
      "read_receipt_sent_at",
      "delivery_failed_at",
      "delivery_failure_event",
      "delivery_failure_reason",
      "failure_notification_sent_at",
      "failure_notification_uncertain_at",
    );
  // These are existing timestamps, not a reconstructed attempt history.
  const history = [
    ["created", row.created_at],
    ["sent", row.sent_at],
    ["delivered", row.delivered_at],
    ["opened", row.opened_at],
    ["read_receipt", stored.read_receipt_sent_at],
    [stored.delivery_failure_event ?? "delivery_failed", stored.delivery_failed_at],
    ["failure_notification", stored.failure_notification_sent_at],
    ["failure_notification_uncertain", stored.failure_notification_uncertain_at],
  ]
    .filter(([, date]) => date)
    .map(([event, date]) => ({
      id: `${id}:${event}`,
      notification_id: id,
      event: String(event),
      environment: "unrecorded",
      occurred_at: date as Date | string,
      attempt: 0,
      details:
        event === stored.delivery_failure_event && stored.delivery_failure_reason
          ? { reason: stored.delivery_failure_reason }
          : {},
    }))
    .sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));
  return {
    row,
    history,
    html: emailPreviewHtml(stored.html_body),
    recipients: row.email ? [row.email] : [],
    cc: stored.cc_emails,
    sentBy: stored.sent_by_email,
    attachments: stored.attachment_names.map((name: string, index: number) => ({
      name,
      id: stored.attachment_ids[index] ?? null,
    })),
    firstAttemptAt: null,
    readReceiptSentAt: stored.read_receipt_sent_at,
  };
}
