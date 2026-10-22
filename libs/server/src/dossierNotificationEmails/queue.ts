import { stagingSuppressesMessage, suppressNotification } from "./suppression.ts";
import type { Knex } from "knex";
import type { EmailMessage } from "../emails.ts";
import { notificationEmailMessage } from "./message.ts";

export type PendingEmail = {
  id: string;
  personne: number;
  dossier: number;
  kind: "assignment" | "novelty" | "arrival";
  batch_key: string;
  first_attempt_at: Date | null;
  message: EmailMessage | null;
  attempt_count: number;
};

export function dueEmails(
  db: Knex | Knex.Transaction,
  now: Date,
  dossier?: number,
  kind?: PendingEmail["kind"],
) {
  const query = db("email_notification_outbox")
    .where({ status: "pending" })
    .where("due_at", "<=", now)
    .andWhere((q) => q.whereNull("retry_at").orWhere("retry_at", "<=", now))
    .andWhere((q) =>
      q.whereNull("claimed_at").orWhere("claimed_at", "<", new Date(now.getTime() - 120_000)),
    );
  if (dossier !== undefined) query.where({ dossier });
  if (kind || dossier !== undefined) query.where({ kind: kind ?? "assignment" });
  return query;
}

export async function claimEmail(
  db: Knex,
  id: string,
  now: Date,
  siteUrl: string,
): Promise<PendingEmail | undefined> {
  return db.transaction(async (trx) => {
    const row = await dueEmails(trx, now)
      .where({ id })
      .forUpdate()
      .skipLocked()
      .first<PendingEmail>();
    if (!row) return undefined;
    const recipient = await recipientForEmail(trx, row);
    if (!recipient) {
      await trx("email_notification_outbox")
        .where({ id })
        .update({ status: "cancelled", claimed_at: null });
      return undefined;
    }
    // A crash or lost response may hide an accepted message. Never retry it after
    // Brevo's deduplication window; an operator must reconcile it with Brevo logs.
    if (row.first_attempt_at && now.getTime() - row.first_attempt_at.getTime() >= 25 * 60_000) {
      await trx("email_notification_outbox").where({ id }).update({
        status: "uncertain",
        claimed_at: null,
        last_error: "deduplication_window_expired",
      });
      return undefined;
    }
    const message = row.message ?? notificationEmailMessage({ ...row, ...recipient }, siteUrl);
    if (stagingSuppressesMessage(message)) {
      await suppressNotification(trx, id);
      return undefined;
    }
    await trx("email_notification_outbox")
      .where({ id })
      .update({
        claimed_at: now,
        first_attempt_at: row.first_attempt_at ?? now,
        message: JSON.stringify(message),
        attempt_count: row.attempt_count + 1,
      });
    return { ...row, message };
  });
}

function recipientForEmail(trx: Knex.Transaction, row: PendingEmail) {
  const recipientQuery = trx("personne as p")
    .join("email_notification_preferences as pref", "pref.personne", "p.id")
    .join("dossier as d", "d.id", trx.raw("?", [row.dossier]))
    .where({ "p.id": row.personne })
    .where(`pref.${row.kind}`, true)
    .whereNotNull("p.email")
    .whereExists(
      trx("cap_dossier as c")
        .join("edge_cap_dossier__groupe_instructeurs as cg", "cg.cap_dossier", "c.cap")
        .join(
          "edge_groupe_instructeurs__dossier as gd",
          "gd.groupe_instructeurs",
          "cg.groupe_instructeurs",
        )
        .select(trx.raw("1"))
        .where("c.personne_cap", trx.ref("p.access_code"))
        .where("gd.dossier", trx.ref("d.id"))
        .modify((q) => {
          if (row.kind === "arrival")
            q.whereExists(
              trx("email_notification_groupe_arrival as arrival")
                .select(trx.raw("1"))
                .where("arrival.dossier", row.dossier)
                .where("arrival.revision", row.batch_key)
                .where("arrival.groupe_instructeurs", trx.ref("gd.groupe_instructeurs")),
            );
        }),
    );
  if (row.kind !== "arrival")
    recipientQuery.whereExists(
      trx("edge_personne_follows_dossier as f")
        .select(trx.raw("1"))
        .where({ "f.personne": row.personne, "f.dossier": row.dossier }),
    );
  return recipientQuery.first<{
    email: string;
    name: string | null;
    enjeu: boolean | null;
    demarche_numerique_number: number | null;
  }>(["p.email", "d.name", "d.enjeu", "d.demarche_numerique_number"]);
}
