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
  // exists yet. `updated_at` is only set on insert so the change date written
  // by the synchronization is preserved. Reading stamps `viewed_at`; marking
  // unread keeps it, since the dossier has still been read at that point.
  const readAt: Pick<Notification, "viewed_at"> | {} = notification.viewed
    ? { viewed_at: new Date() }
    : {};
  return await databaseConnection("notification")
    .insert({
      dossier: notification.dossier,
      personne: personne.id,
      viewed: notification.viewed,
      ...readAt,
    })
    .onConflict(["dossier", "personne"])
    .merge(["viewed", ...(notification.viewed ? (["viewed_at"] as const) : [])]);
}
