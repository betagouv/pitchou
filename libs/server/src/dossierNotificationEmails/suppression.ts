import { randomUUID } from "node:crypto";
import type EmailNotificationOutbox from "@pitchou/types/database/public/EmailNotificationOutbox.ts";
import type { Knex } from "knex";
import type { EmailMessage } from "../emails.ts";
import { assertStagingRecipients, StagingEmailSuppressedError } from "../emails/recipients.ts";

export function stagingSuppressesMessage(message: EmailMessage): boolean {
  try {
    assertStagingRecipients([...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])]);
    return false;
  } catch (error) {
    if (!(error instanceof StagingEmailSuppressedError)) throw error;
    return true;
  }
}

export function suppressNotification(db: Knex | Knex.Transaction, id: string) {
  return db.transaction(async (trx) => {
    const [row] = await trx("email_notification_outbox")
      .where({ id, status: "pending" })
      .update({
        status: "suppressed",
        cancellation_reason: "staging_allowlist",
        claimed_at: null,
        retry_at: null,
        last_error: null,
      })
      .returning<EmailNotificationOutbox[]>("*");
    if (!row) return;
    const historyId = randomUUID();
    const happenedAt = new Date();
    const details = {
      notificationId: row.id,
      type: row.kind,
      recipientId: row.personne,
      dossierId: row.dossier,
      scheduledAt: row.due_at,
      occurredAt: happenedAt,
      attempt: row.attempt_count,
      environment: row.environment,
      source: "system",
      attribution: "recipient",
      reason: row.cancellation_reason,
    };
    await trx("email_notification_history").insert({
      id: historyId,
      notification_id: row.id,
      personne: row.personne,
      dossier: row.dossier,
      kind: row.kind,
      event: "suppressed",
      occurred_at: happenedAt,
      environment: row.environment,
      attempt: row.attempt_count,
      details,
    });
    await trx("evenement_metrique").insert({
      id: historyId,
      personne: row.personne,
      date: happenedAt,
      evenement: "notificationEmailSuppressed",
      details,
    });
  });
}
