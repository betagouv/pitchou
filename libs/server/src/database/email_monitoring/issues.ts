import type { Knex } from "knex";
import type { EmailRow } from "@pitchou/types/adminEmails.ts";

// Match the actual envelope, even if the account address has changed since sending.
// Technical alert delivery state does not determine whether the original mail failed.
export function notificationDeliveryIssues(db: Knex.Transaction, row?: EmailRow) {
  return db("email_issue_notification as i")
    .whereRaw("i.issue->>'providerMessageId' = ?", [
      row ? row.provider_message_id : db.ref("n.provider_message_id"),
    ])
    .whereRaw("i.issue->>'recipient' = ?", [
      row ? row.email : db.raw("coalesce(n.message->'to'->>0, p.email)"),
    ])
    .whereRaw("i.issue->>'environment' = ?", [
      row ? `pitchou-env-${row.environment}` : db.raw("'pitchou-env-' || n.environment"),
    ])
    .whereRaw(
      "i.issue->>'type' IN ('soft_bounce', 'hard_bounce', 'blocked', 'invalid_email', 'error')",
    )
    .orderByRaw("i.issue->>'occurredAt' DESC")
    .orderBy("i.id");
}
