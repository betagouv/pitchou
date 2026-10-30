import type { Knex } from "knex";
import type { EmailRow } from "@pitchou/types/adminEmails.ts";

// Technical alert delivery state does not determine whether the original mail failed.
function deliveryIssues(db: Knex.Transaction) {
  return db("email_issue_notification as i").whereRaw(
    "i.issue->>'type' IN ('soft_bounce', 'hard_bounce', 'blocked', 'invalid_email', 'error')",
  );
}

// Match the actual envelope, even if the account address has changed since sending.
export function notificationDeliveryIssues(db: Knex.Transaction, row: EmailRow) {
  return deliveryIssues(db)
    .whereRaw("i.issue->>'providerMessageId' = ?", [row.provider_message_id])
    .whereRaw("i.issue->>'recipient' = ?", [row.email])
    .whereRaw("i.issue->>'environment' = ?", [`pitchou-env-${row.environment}`])
    .orderByRaw("i.issue->>'occurredAt' DESC")
    .orderBy("i.id");
}

// Group the retained failures once, rather than scanning them for each notification.
export function latestNotificationDeliveryIssues(db: Knex.Transaction) {
  return deliveryIssues(db)
    .distinctOn("provider_message_id", "recipient", "environment")
    .select("i.id")
    .select(
      db.raw(`i.issue->>'providerMessageId' as provider_message_id,
      i.issue->>'recipient' as recipient, i.issue->>'environment' as environment,
      i.issue->>'reason' as reason`),
    )
    .orderBy("provider_message_id")
    .orderBy("recipient")
    .orderBy("environment")
    .orderByRaw("i.issue->>'occurredAt' DESC")
    .orderBy("i.id");
}
