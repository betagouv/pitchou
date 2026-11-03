import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type { DossierCnpnEmailBrevoEvent } from "../../cnpnEmailBrevo.ts";

export type FailureNotification = {
  eventId: string;
  claimedAt: Date;
  sentByEmail: string;
  dossierId: number;
  subject: string;
  reason: string;
};

type FailureResult = {
  matched: true;
  failureNotification?: FailureNotification;
  retryFailureNotification?: boolean;
};

export async function recordDeliveryFailure(
  id: string,
  event: DossierCnpnEmailBrevoEvent,
  db: Knex.Transaction | Knex,
): Promise<FailureResult> {
  return db.transaction(async (transaction) => {
    // Keep the cutoff and claim decisions atomic even for an exact duplicate bounce.
    await transaction("dossier_cnpn_email_sent_event").where({ id }).forUpdate().first("id");
    return recordFailure(id, event, transaction);
  });
}

async function recordFailure(
  id: string,
  event: DossierCnpnEmailBrevoEvent,
  db: Knex.Transaction,
): Promise<FailureResult> {
  const match = { id, status: "sent" };
  await db("dossier_cnpn_email_sent_event")
    .where(match)
    .andWhere((query) =>
      query.whereNull("delivery_failed_at").orWhere("delivery_failed_at", "<", event.occurredAt),
    )
    .update({
      delivery_failed_at: event.occurredAt,
      delivery_failure_event: event.type,
      delivery_failure_reason: event.reason ?? null,
    });

  // A delayed bounce must not alert the sender after confirmed delivery or opening.
  const claimedAt = new Date();
  await markExpiredFailureNotification(id, claimedAt, db);
  const [notification] = await db("dossier_cnpn_email_sent_event")
    .where(match)
    .whereNull("delivered_at")
    .whereNull("opened_at")
    .whereNull("failure_notification_sent_at")
    .whereNull("failure_notification_uncertain_at")
    .andWhere((query) =>
      query
        .whereNull("failure_notification_claimed_at")
        .orWhere("failure_notification_claimed_at", "<", new Date(+claimedAt - 5 * 60_000)),
    )
    .update({
      failure_notification_claimed_at: claimedAt,
      failure_notification_first_attempt_at: db.raw(
        "coalesce(failure_notification_first_attempt_at, ?)",
        [claimedAt],
      ),
    })
    .returning(["dossier", "sent_by_email", "subject", "delivery_failure_reason"]);
  if (notification) {
    return {
      matched: true,
      failureNotification: {
        eventId: id,
        claimedAt,
        sentByEmail: notification.sent_by_email,
        dossierId: notification.dossier,
        subject: notification.subject,
        reason: notification.delivery_failure_reason ?? "Motif non communiqué par Brevo",
      },
    };
  }
  const existing = await db("dossier_cnpn_email_sent_event").where(match).first();
  return {
    matched: true,
    retryFailureNotification: Boolean(
      existing?.failure_notification_claimed_at &&
      !existing.failure_notification_sent_at &&
      !existing.failure_notification_uncertain_at &&
      !existing.delivered_at &&
      !existing.opened_at,
    ),
  };
}

async function markExpiredFailureNotification(id: string, now: Date, db: Knex.Transaction | Knex) {
  await db("dossier_cnpn_email_sent_event")
    .where({ id, status: "sent" })
    .whereNull("failure_notification_sent_at")
    .whereNull("failure_notification_uncertain_at")
    .where("failure_notification_first_attempt_at", "<=", new Date(+now - 25 * 60_000))
    .andWhere((query) =>
      query
        .whereNull("failure_notification_claimed_at")
        .orWhere("failure_notification_claimed_at", "<", new Date(+now - 5 * 60_000)),
    )
    .update({ failure_notification_uncertain_at: now, failure_notification_claimed_at: null });
}

export async function completeFailureNotification(
  id: string,
  claimedAt: Date,
  sent: boolean,
  db: Knex.Transaction | Knex = directDatabaseConnection,
  definitiveFailure = false,
) {
  if (!sent && definitiveFailure) {
    await db("dossier_cnpn_email_sent_event")
      .where({
        id,
        failure_notification_claimed_at: claimedAt,
        failure_notification_first_attempt_at: claimedAt,
      })
      .whereNull("failure_notification_sent_at")
      .update({ failure_notification_first_attempt_at: null });
  }
  await db("dossier_cnpn_email_sent_event")
    .where({ id, failure_notification_claimed_at: claimedAt })
    .whereNull("failure_notification_sent_at")
    .update({
      failure_notification_claimed_at: null,
      ...(sent ? { failure_notification_sent_at: db.fn.now() } : {}),
    });
}
