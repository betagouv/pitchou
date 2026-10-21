import type { Knex } from "knex";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import type { EmailNotificationPreferences } from "@pitchou/types/capabilities.ts";
import { directDatabaseConnection } from "../database.ts";
import { getPersonneByDossierCap } from "./personne.ts";

export async function emailNotificationPreferencesFromCap(
  cap: CapDossierCap,
  preferences?: EmailNotificationPreferences,
  db: Knex | Knex.Transaction = directDatabaseConnection,
): Promise<EmailNotificationPreferences | undefined> {
  const personne = await getPersonneByDossierCap(cap, db);
  if (!personne) return undefined;
  if (preferences) {
    await db("email_notification_preferences").where({ personne: personne.id }).update(preferences);
  }
  return db("email_notification_preferences")
    .select("assignment", "novelty", "arrival")
    .where({ personne: personne.id })
    .first();
}
