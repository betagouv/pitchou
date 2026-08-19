import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { getPersonneByDossierCap } from "./personne.ts";

import type Notification from "@pitchou/types/database/public/Notification.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";

/**
 * Fetches the notifications of a given personne
 */
export async function getNotificationsForPersonneFromCap(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Notification[]> {
  const personne = await getPersonneByDossierCap(cap);

  if (!personne) {
    throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`);
  }

  return databaseConnection("notification").select("*").where("personne", personne.id);
}

/**
 * Marks dossiers unread for every instructeur following them, dating the change
 * with the moment it happened on the pétitionnaire's side. An unread flag is only
 * raised when that moment is more recent than the one already stored: replaying an
 * older synchronization must not resurrect a notification.
 */
export async function markDossiersUnreadForFollowers(
  modifiedAtByDossier: Map<Notification["dossier"], Date>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (modifiedAtByDossier.size === 0) return;

  const followers: { dossier: Notification["dossier"]; personne: Notification["personne"] }[] =
    await databaseConnection("edge_personne_follows_dossier")
      .select(["dossier", "personne"])
      .whereIn("dossier", [...modifiedAtByDossier.keys()]);
  if (followers.length === 0) return;

  await databaseConnection("notification")
    .insert(
      followers.map(({ dossier, personne }) => ({
        dossier,
        personne,
        updated_at: modifiedAtByDossier.get(dossier),
        viewed: false,
      })),
    )
    .onConflict(["dossier", "personne"])
    .merge()
    .whereRaw("(notification.updated_at IS NULL OR EXCLUDED.updated_at > notification.updated_at)");
}

/**
 * Updates the notification of a personne's dossier from its capability.
 */
export async function updateNotificationDossierFromCap(
  cap: CapDossier["cap"],
  notification: Pick<Notification, "dossier" | "viewed">,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const personne = await getPersonneByDossierCap(cap);

  if (!personne) {
    throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`);
  }

  // Upsert: marking a dossier unread must work even when no notification row
  // exists yet. `updated_at` belongs to the synchronization — it dates the
  // pétitionnaire's last change and drives « Modifié le … » and the list sort —
  // so reading never writes it, and the insert leaves it null rather than
  // letting the column default stamp now(). Reading stamps `viewed_at`; marking
  // unread keeps it, since the dossier has still been read at that point.
  const readAt: Pick<Notification, "viewed_at"> | {} = notification.viewed
    ? { viewed_at: new Date() }
    : {};
  return await databaseConnection("notification")
    .insert({
      dossier: notification.dossier,
      personne: personne.id,
      viewed: notification.viewed,
      updated_at: null,
      ...readAt,
    })
    .onConflict(["dossier", "personne"])
    .merge(["viewed", ...(notification.viewed ? (["viewed_at"] as const) : [])]);
}
