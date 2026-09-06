import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

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
