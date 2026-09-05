import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import type {
  DossierCnpnEmailSentEvent,
  SendCnpnEmailRequest,
} from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export { getAuthorizedDossierFiles } from "./dossier_cnpn_email/files.ts";
export {
  recordDossierCnpnEmailBrevoEvent,
  markDossierCnpnEmailReadReceiptSent,
  releaseDossierCnpnEmailReadReceipt,
} from "./dossier_cnpn_email/brevo.ts";

const sentEventColumns = [
  "id",
  "dossier",
  "sent_by_email",
  "sent_at",
  "delivered_at",
  "opened_at",
  "recipient_email",
  "cc_emails",
  "subject",
  "attachment_ids",
  "attachment_names",
] as const;

export type DossierCnpnEmailStats = {
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
};

export async function getDossierCnpnEmailStats(
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierCnpnEmailStats> {
  const counts = await db("dossier_cnpn_email_sent_event")
    .where({ status: "sent" })
    .select(
      db.raw("count(*) as sent_count"),
      db.raw("count(delivered_at) as delivered_count"),
      db.raw("count(opened_at) as opened_count"),
    )
    .first();
  return {
    sentCount: Number(counts.sent_count),
    deliveredCount: Number(counts.delivered_count),
    openedCount: Number(counts.opened_count),
  };
}

export function getDossierCnpnEmailSentEvents(
  dossierId: Dossier["id"],
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierCnpnEmailSentEvent[]> {
  return db("dossier_cnpn_email_sent_event")
    .select(sentEventColumns)
    .where({ dossier: dossierId, status: "sent" })
    .orderBy("sent_at", "desc");
}

export function getDossierCnpnEmailSentEventById(
  id: string,
  dossierId: Dossier["id"],
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierCnpnEmailSentEvent | undefined> {
  return db("dossier_cnpn_email_sent_event")
    .select(sentEventColumns)
    .where({ id, dossier: dossierId, status: "sent" })
    .first();
}

export async function createDossierCnpnEmailSendAttempt(
  event: {
    id: string;
    dossier: Dossier["id"];
    sentBy: Personne["id"];
    sentByEmail: string;
    recipientEmail: string;
    ccEmails: string[];
    subject: SendCnpnEmailRequest["subject"];
    htmlBody: SendCnpnEmailRequest["htmlBody"];
    payloadHash: string;
    attachmentIds: File["id"][];
    attachmentNames: string[];
  },
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const created = await db("dossier_cnpn_email_sent_event")
    .insert({
      id: event.id,
      dossier: event.dossier,
      sent_by: event.sentBy,
      sent_by_email: event.sentByEmail,
      recipient_email: event.recipientEmail,
      cc_emails: event.ccEmails,
      subject: event.subject,
      html_body: event.htmlBody,
      payload_hash: event.payloadHash,
      attachment_ids: event.attachmentIds,
      attachment_names: event.attachmentNames,
    })
    .onConflict()
    .ignore()
    .returning("id");
  return created.length === 1;
}

export function getDossierCnpnEmailSendAttempt(
  id: string,
  dossierId: Dossier["id"],
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ status: "pending" | "sent" | "failed"; payload_hash: string } | undefined> {
  return db("dossier_cnpn_email_sent_event")
    .select(["status", "payload_hash"])
    .where({ id, dossier: dossierId })
    .first();
}

export function getPendingDossierCnpnEmailSendAttempt(
  dossierId: Dossier["id"],
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: string } | undefined> {
  return db("dossier_cnpn_email_sent_event")
    .select("id")
    .where({ dossier: dossierId, status: "pending" })
    .first();
}

export async function restartDossierCnpnEmailFailedAttempt(
  id: string,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const restarted = await db("dossier_cnpn_email_sent_event")
    .where({ id, status: "failed" })
    .update({ status: "pending" })
    .returning("id");
  return restarted.length === 1;
}

export async function markDossierCnpnEmailSendAttemptSent(
  id: string,
  providerMessageId: string,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierCnpnEmailSentEvent> {
  const [event] = await db("dossier_cnpn_email_sent_event")
    .where({ id, status: "pending" })
    .update({
      status: "sent",
      sent_at: db.fn.now(),
      provider_message_id: providerMessageId,
    })
    .returning(sentEventColumns);
  if (event) return event;
  const existing = await db("dossier_cnpn_email_sent_event")
    .select(sentEventColumns)
    .where({ id, status: "sent" })
    .first();
  if (existing) return existing;
  throw new Error(`Tentative d'envoi CNPN introuvable : ${id}`);
}

export async function markDossierCnpnEmailSendAttemptFailed(
  id: string,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await db("dossier_cnpn_email_sent_event")
    .where({ id, status: "pending" })
    .update({ status: "failed" });
}
