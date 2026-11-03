import { directDatabaseConnection } from "./database.ts";
import { recordDossierCnpnEmailBrevoEvent } from "./database/dossier_cnpn_email.ts";
import {
  markDossierCnpnEmailReadReceiptSent,
  releaseDossierCnpnEmailReadReceipt,
} from "./database/dossier_cnpn_email.ts";
import { sendCnpnEmailReadReceipt, isDefinitiveEmailSendFailure } from "./emails.ts";
import { sendCnpnEmailDeliveryFailure } from "./emails/cnpnFailure.ts";
import { completeFailureNotification } from "./database/dossier_cnpn_email/failure.ts";

export type DossierCnpnEmailBrevoEvent = {
  type:
    | "delivered"
    | "opened"
    | "soft_bounce"
    | "hard_bounce"
    | "blocked"
    | "invalid_email"
    | "error";
  providerMessageId: string;
  requestId?: string;
  recipientEmail: string;
  occurredAt: Date;
  reason?: string;
};

export type DossierCnpnEmailBrevoProcessingResult = "processed" | "retry" | "unmatched";

export async function processDossierCnpnEmailBrevoEvent(
  event: DossierCnpnEmailBrevoEvent,
): Promise<DossierCnpnEmailBrevoProcessingResult> {
  const recorded = await directDatabaseConnection.transaction((transaction) =>
    recordDossierCnpnEmailBrevoEvent(event, transaction),
  );
  if (!recorded.matched) return "unmatched";
  if (recorded.retryFailureNotification) return "retry";
  if (recorded.failureNotification) {
    const notification = recorded.failureNotification;
    try {
      await sendCnpnEmailDeliveryFailure(notification.sentByEmail, notification);
      await completeFailureNotification(notification.eventId, notification.claimedAt, true);
    } catch (error) {
      await completeFailureNotification(
        notification.eventId,
        notification.claimedAt,
        false,
        undefined,
        isDefinitiveEmailSendFailure(error),
      ).catch(() => {});
      throw error;
    }
  }
  if (recorded.retryReadReceipt) return "retry";
  if (!recorded.readReceipt) return "processed";

  try {
    await sendCnpnEmailReadReceipt(recorded.readReceipt.sentByEmail, {
      eventId: recorded.readReceipt.eventId,
      dossierId: recorded.readReceipt.dossierId,
      originalSubject: recorded.readReceipt.subject,
    });
    await markDossierCnpnEmailReadReceiptSent(
      recorded.readReceipt.eventId,
      recorded.readReceipt.claimedAt,
    );
  } catch (error) {
    await releaseDossierCnpnEmailReadReceipt(
      recorded.readReceipt.eventId,
      recorded.readReceipt.claimedAt,
    ).catch(() => {});
    throw error;
  }
  return "processed";
}
