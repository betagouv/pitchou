import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import type {
  DossierCnpnEmailSentEvent,
  SendCnpnEmailRequest,
} from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

type AuthorizedFile = Pick<File, "id" | "name" | "media_type" | "size">;
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

export async function getAuthorizedDossierFiles(
  dossierId: Dossier["id"],
  fileIds: File["id"][],
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AuthorizedFile[]> {
  if (fileIds.length === 0) return [];

  const [project, avisSaisine, avis, decisions, others] = await Promise.all([
    db("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .where({ dossier: dossierId })
      .whereIn("fichier", fileIds)
      .pluck("fichier"),
    db("avis_expert")
      .where({ dossier: dossierId })
      .whereIn("saisine_fichier", fileIds)
      .pluck("saisine_fichier"),
    db("avis_expert")
      .where({ dossier: dossierId })
      .whereIn("avis_fichier", fileIds)
      .pluck("avis_fichier"),
    db("decision_administrative")
      .where({ dossier: dossierId })
      .whereIn("fichier", fileIds)
      .pluck("fichier"),
    db("other_attachment")
      .where({ dossier: dossierId })
      .whereIn("fichier", fileIds)
      .pluck("fichier"),
  ]);
  const authorizedIds = new Set([...project, ...avisSaisine, ...avis, ...decisions, ...others]);
  if (fileIds.some((id) => !authorizedIds.has(id))) return [];

  return db("file").select(["id", "name", "media_type", "size"]).whereIn("id", fileIds);
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

export async function recordDossierCnpnEmailBrevoEvent(
  event: {
    type: "delivered" | "opened";
    providerMessageId: string;
    requestId?: string;
    recipientEmail: string;
    occurredAt: Date;
  },
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  | { matched: false }
  | {
      matched: true;
      readReceipt?: {
        eventId: string;
        claimedAt: Date;
        sentByEmail: string;
        dossierId: Dossier["id"];
        subject: string;
      };
      retryReadReceipt?: boolean;
    }
> {
  const column = event.type === "delivered" ? "delivered_at" : "opened_at";
  const messageQuery = db("dossier_cnpn_email_sent_event");
  if (event.requestId) messageQuery.where({ id: event.requestId });
  else messageQuery.where({ status: "sent", provider_message_id: event.providerMessageId });
  const message = await messageQuery.first(["id", "recipient_email", "status", "created_at"]);
  if (!message) return { matched: false };

  if (message.status === "pending") {
    await db("dossier_cnpn_email_sent_event").where({ id: message.id, status: "pending" }).update({
      status: "sent",
      sent_at: message.created_at,
      provider_message_id: event.providerMessageId,
    });
  }
  if (message.recipient_email !== event.recipientEmail.toLowerCase()) return { matched: true };

  const match = { id: message.id, status: "sent" };
  const query = db("dossier_cnpn_email_sent_event").where(match);
  query.andWhere((builder) => builder.whereNull(column).orWhere(column, ">", event.occurredAt));
  const updated = await query.update({ [column]: event.occurredAt }).returning("id");

  if (event.type === "opened") {
    const claimedAt = new Date();
    const claimExpiredBefore = new Date(claimedAt.getTime() - 5 * 60 * 1000);
    const [receipt] = await db("dossier_cnpn_email_sent_event")
      .where(match)
      .whereNull("read_receipt_sent_at")
      .andWhere((builder) =>
        builder
          .whereNull("read_receipt_claimed_at")
          .orWhere("read_receipt_claimed_at", "<", claimExpiredBefore),
      )
      .update({ read_receipt_claimed_at: claimedAt })
      .returning<{ id: string; dossier: Dossier["id"]; sent_by_email: string; subject: string }[]>([
        "id",
        "dossier",
        "sent_by_email",
        "subject",
      ]);
    if (receipt) {
      return {
        matched: true,
        readReceipt: {
          eventId: receipt.id,
          claimedAt,
          sentByEmail: receipt.sent_by_email,
          dossierId: receipt.dossier,
          subject: receipt.subject,
        },
      };
    }
  }

  if (updated.length > 0 && event.type !== "opened") return { matched: true };
  const existing = await db("dossier_cnpn_email_sent_event")
    .where(match)
    .first(["id", "read_receipt_claimed_at", "read_receipt_sent_at"]);
  if (
    existing &&
    event.type === "opened" &&
    !existing.read_receipt_sent_at &&
    existing.read_receipt_claimed_at
  ) {
    return { matched: true, retryReadReceipt: true };
  }
  return existing ? { matched: true } : { matched: false };
}

export async function markDossierCnpnEmailReadReceiptSent(
  eventId: string,
  claimedAt: Date,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await db("dossier_cnpn_email_sent_event")
    .where({ id: eventId, read_receipt_claimed_at: claimedAt })
    .whereNull("read_receipt_sent_at")
    .update({ read_receipt_sent_at: db.fn.now(), read_receipt_claimed_at: null });
}

export async function releaseDossierCnpnEmailReadReceipt(
  eventId: string,
  claimedAt: Date,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await db("dossier_cnpn_email_sent_event")
    .where({ id: eventId, read_receipt_claimed_at: claimedAt })
    .whereNull("read_receipt_sent_at")
    .update({ read_receipt_claimed_at: null });
}
