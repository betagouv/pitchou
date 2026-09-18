import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import { getPersonneByDossierCap } from "./personne.ts";
import { dossiersAccessibleViaCap } from "./dossier/access.ts";
import { aggregateNotification } from "./notification/aggregate.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierNotification, NotificationUpdate } from "@pitchou/types/notification.ts";

export async function getNotificationsForPersonneFromCap(
  cap: CapDossier["cap"],
  db: Knex.Transaction | Knex = directDatabaseConnection,
  dossierId?: DossierId,
): Promise<DossierNotification[]> {
  const personne = await getPersonneByDossierCap(cap, db);
  if (!personne) throw new Error("Capability inconnue");
  const accessible = db("edge_groupe_instructeurs__dossier as gd")
    .join(
      "edge_cap_dossier__groupe_instructeurs as cg",
      "cg.groupe_instructeurs",
      "gd.groupe_instructeurs",
    )
    .where("cg.cap_dossier", cap)
    .distinct("gd.dossier");
  if (dossierId !== undefined) accessible.where("gd.dossier", dossierId);
  const applicantChanges = db("action_dossier as a")
    .whereIn("a.dossier", accessible.clone())
    .where("a.author_petitionnaire", true)
    .whereRaw("a.data->>'notification' = 'true'");
  const [dossiers, notifications, arrivals, actions, latestChanges] = await Promise.all([
    accessible.clone(),
    db("notification").where("personne", personne.id).whereIn("dossier", accessible.clone()),
    db("notification_arrival").whereIn("dossier", accessible.clone()),
    applicantChanges
      .clone()
      .select("a.*")
      .where(function () {
        this.whereRaw("COALESCE(a.data->>'notification_legacy', 'false') <> 'true'").orWhereExists(
          db("notification as legacy")
            .select(db.raw("1"))
            .where("legacy.dossier", db.ref("a.dossier"))
            .where({ "legacy.personne": personne.id, "legacy.receive_legacy_changes": true }),
        );
      })
      .whereNotExists(
        db("notification_review as r")
          .select(db.raw("1"))
          .where("r.action", db.ref("a.id"))
          .where("r.personne", personne.id),
      ),
    applicantChanges
      .clone()
      .select("a.dossier")
      .max("a.created_at as detected_at")
      .groupBy("a.dossier"),
  ]);
  const byDossier = new Map(notifications.map((row) => [row.dossier, row]));
  const arrivalByDossier = new Map(arrivals.map((row) => [row.dossier, row.created_at]));
  const actionsByDossier = Map.groupBy(actions, (row) => row.dossier);
  const latestByDossier = new Map(latestChanges.map((row) => [row.dossier, row.detected_at]));
  return dossiers.map(({ dossier }) =>
    aggregateNotification(
      dossier,
      byDossier.get(dossier),
      arrivalByDossier.get(dossier),
      actionsByDossier.get(dossier) ?? [],
      latestByDossier.get(dossier) ?? null,
    ),
  );
}

export async function updateNotificationDossierFromCap(
  cap: CapDossier["cap"],
  update: NotificationUpdate,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierNotification> {
  return db.transaction(async (trx) => {
    const personne = await getPersonneByDossierCap(cap, trx);
    if (
      !personne ||
      (await dossiersAccessibleViaCap(update.dossier, cap, trx)).get(update.dossier) !== "complet"
    ) {
      throw new Error("Accès au dossier refusé");
    }
    if (update.arrival) {
      await trx("notification")
        .insert({
          dossier: update.dossier,
          personne: personne.id,
          updated_at: null,
          arrival_viewed: true,
          viewed_at: new Date(),
        })
        .onConflict(["dossier", "personne"])
        .merge(["arrival_viewed", "viewed_at"]);
    }
    if (update.followRevision) {
      await trx("notification")
        .where({
          dossier: update.dossier,
          personne: personne.id,
          follow_revision: update.followRevision,
        })
        .update({ follow_revision: null, follow_at: null, viewed_at: new Date() });
    }
    if (update.revisions?.length) {
      // Acknowledge only the exact revisions the user saw, never "the latest".
      const actions = await trx("action_dossier")
        .select("id")
        .where({ dossier: update.dossier, author_petitionnaire: true })
        .whereRaw("data->>'notification' = 'true'")
        .whereIn("id", update.revisions);
      if (actions.length)
        await trx("notification_review")
          .insert(actions.map(({ id }) => ({ action: id, personne: personne.id })))
          .onConflict(["action", "personne"])
          .ignore();
    }
    const [notification] = await getNotificationsForPersonneFromCap(cap, trx, update.dossier);
    if (!notification) throw new Error("Accès au dossier refusé");
    await trx("notification")
      .insert({
        dossier: update.dossier,
        personne: personne.id,
        viewed: notification.viewed,
        updated_at: notification.updated_at,
      })
      .onConflict(["dossier", "personne"])
      .merge(["viewed", "updated_at"]);
    return notification;
  });
}

// Refresh the legacy follower cache from detected revisions, never a broad DN date.
// The endpoint computes the authoritative personal aggregate, including arrivals.
export async function markDossiersUnreadForFollowers(
  modifiedAtByDossier: Map<DossierId, Date>,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (!modifiedAtByDossier.size) return;
  const rows = await db("action_dossier as a")
    .join("edge_personne_follows_dossier as f", "f.dossier", "a.dossier")
    .select("a.dossier", "f.personne")
    .max("a.created_at as updated_at")
    .whereIn("a.dossier", [...modifiedAtByDossier.keys()])
    .where("a.author_petitionnaire", true)
    .whereRaw("a.data->>'notification' = 'true'")
    .groupBy("a.dossier", "f.personne");
  if (rows.length)
    await db("notification")
      .insert(rows.map((row) => ({ ...row, viewed: false })))
      .onConflict(["dossier", "personne"])
      .merge(["updated_at", "viewed"]);
}
