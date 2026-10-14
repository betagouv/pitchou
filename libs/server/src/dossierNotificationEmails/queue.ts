import type { Knex } from "knex";
import type { EmailMessage } from "../emails.ts";
import { notificationEmailMessage } from "./message.ts";

export type PendingEmail = {
  id: string;
  personne: number;
  dossier: number;
  kind: "assignment" | "novelty";
  first_attempt_at: Date | null;
  message: EmailMessage | null;
};

export function dueEmails(db: Knex | Knex.Transaction, now: Date, dossier?: number) {
  const query = db("email_notification_outbox")
    .where({ status: "pending" })
    .where("due_at", "<=", now)
    .andWhere((q) => q.whereNull("retry_at").orWhere("retry_at", "<=", now))
    .andWhere((q) =>
      q.whereNull("claimed_at").orWhere("claimed_at", "<", new Date(now.getTime() - 120_000)),
    );
  if (dossier !== undefined) query.where({ dossier, kind: "assignment" });
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
    const recipient = await trx("personne as p")
      .join("email_notification_preferences as pref", "pref.personne", "p.id")
      .join("edge_personne_follows_dossier as f", "f.personne", "p.id")
      .join("dossier as d", "d.id", "f.dossier")
      .where({ "p.id": row.personne, "f.dossier": row.dossier })
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
          .where("gd.dossier", trx.ref("d.id")),
      )
      .first<{
        email: string;
        name: string | null;
        enjeu: boolean | null;
        demarche_numerique_number: number | null;
      }>(["p.email", "d.name", "d.enjeu", "d.demarche_numerique_number"]);
    if (!recipient) {
      await trx("email_notification_outbox")
        .where({ id })
        .update({ status: "cancelled", claimed_at: null });
      return undefined;
    }
    // A crash or lost response may hide an accepted message. Never retry it after
    // Brevo's deduplication window; an operator must reconcile it with Brevo logs.
    if (row.first_attempt_at && now.getTime() - row.first_attempt_at.getTime() >= 25 * 60_000) {
      await trx("email_notification_outbox")
        .where({ id })
        .update({ status: "uncertain", claimed_at: null });
      return undefined;
    }
    const message = row.message ?? notificationEmailMessage({ ...row, ...recipient }, siteUrl);
    await trx("email_notification_outbox")
      .where({ id })
      .update({
        claimed_at: now,
        first_attempt_at: row.first_attempt_at ?? now,
        message: JSON.stringify(message),
      });
    return { ...row, message };
  });
}
