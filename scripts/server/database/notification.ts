import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.js";
import { getPersonneByDossierCap } from "./personne.js";

import type {
  default as Notification,
  NotificationInitializer,
} from "../../types/database/public/Notification.ts";
import type { default as CapDossier } from "../../types/database/public/CapDossier.ts";

/**
 * Récupère les notifications d'une personne donnée
 */
export async function getNotificationsPourPersonneDepuisCap(
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
 * Met à jour la notification d'un dossier d'une personne à partir de sa capability.
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

  const notificationÀUpdate = { vue: notification.vue };

  return await databaseConnection("notification").update(notificationÀUpdate).where({
    dossier: notification.dossier,
    personne: personne.id,
  });
}
