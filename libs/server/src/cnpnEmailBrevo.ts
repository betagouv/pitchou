import { directDatabaseConnection } from "./database.ts";
import { recordDossierCnpnEmailBrevoEvent } from "./database/dossier_cnpn_email.ts";
import {
  markDossierCnpnEmailReadReceiptSent,
  releaseDossierCnpnEmailReadReceipt,
} from "./database/dossier_cnpn_email.ts";
import { sendCnpnEmailReadReceipt } from "./emails.ts";

export type DossierCnpnEmailBrevoEvent = {
  type: "delivered" | "opened";
  providerMessageId: string;
  requestId?: string;
  recipientEmail: string;
  occurredAt: Date;
};

export type DossierCnpnEmailBrevoProcessingResult = "processed" | "retry" | "unmatched";

export async function processDossierCnpnEmailBrevoEvent(
  event: DossierCnpnEmailBrevoEvent,
): Promise<DossierCnpnEmailBrevoProcessingResult> {
  const recorded = await directDatabaseConnection.transaction((transaction) =>
    recordDossierCnpnEmailBrevoEvent(event, transaction),
  );
  if (!recorded.matched) return "unmatched";
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
    ).catch(() => undefined);
    throw error;
  }
  return "processed";
}
