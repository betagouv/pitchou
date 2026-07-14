import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { getPersonneByDossierCap } from "./personne.ts";

import type {
  default as Notification,
  NotificationInitializer,
} from "@pitchou/types/database/public/Notification.ts";
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
  notification: NotificationInitializer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const personne = await getPersonneByDossierCap(cap);

  if (!personne) {
    throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`);
  }

  const notificationToUpdate = { vue: notification.vue };

  return await databaseConnection("notification").update(notificationToUpdate).where({
    dossier: notification.dossier,
    personne: personne.id,
  });
}
