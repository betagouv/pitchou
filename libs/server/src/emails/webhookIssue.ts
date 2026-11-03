import type { DossierCnpnEmailBrevoEvent } from "../cnpnEmailBrevo.ts";
import { directDatabaseConnection as db } from "../database.ts";
import { reportEmailIssue, ISSUE_NOTIFICATION_TAG, TECH_EMAIL } from "./issues.ts";
import { getEmailEnvironmentTag } from "./delivery.ts";

export async function reportBrevoWebhookIssue(
  event: DossierCnpnEmailBrevoEvent,
  tags: string[],
  subject: string,
) {
  if (
    ["delivered", "opened"].includes(event.type) ||
    tags.includes(ISSUE_NOTIFICATION_TAG) ||
    event.recipientEmail === TECH_EMAIL
  )
    return "processed";
  const environment = getEmailEnvironmentTag();
  if (!tags.includes(environment)) {
    // An early webhook can have the local request ID before the send response is saved.
    const cnpn = await db("dossier_cnpn_email_sent_event")
      .where(
        event.requestId
          ? { id: event.requestId }
          : { provider_message_id: event.providerMessageId },
      )
      .first("id");
    const notification = cnpn
      ? null
      : await db("email_notification_outbox")
          .where({ provider_message_id: event.providerMessageId })
          .first("id");
    if (!cnpn && !notification) return "processed";
  }
  return reportEmailIssue({
    key: `delivery:${event.providerMessageId}:${event.recipientEmail}`,
    environment,
    type: event.type,
    recipient: event.recipientEmail,
    subject,
    reason: event.reason ?? "Motif non communiqué par Brevo",
    occurredAt: event.occurredAt,
    providerMessageId: event.providerMessageId,
  });
}
