import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { EmailNotificationPreferences } from "@pitchou/types/capabilities.ts";
import { directDatabaseConnection } from "../database.ts";

export async function emailNotificationPreferencesForUser(
  userId: UserId,
  preferences?: EmailNotificationPreferences,
  db: Knex | Knex.Transaction = directDatabaseConnection,
): Promise<EmailNotificationPreferences | undefined> {
  if (preferences) {
    return db.transaction(async (trx) => {
      // Serialize with account deactivation before waiting for the preferences row.
      await trx.raw("select pg_advisory_xact_lock(2105102026)");
      const personne = await trx("auth_user").where({ id: userId, active: true }).first();
      if (!personne) return undefined;
      await trx.raw("SELECT set_config('pitchou.settings_actor', ?, true)", [String(personne.id)]);
      await trx("email_notification_preferences")
        .where({ personne: personne.id })
        .forUpdate()
        .first();
      await trx("email_notification_preferences")
        .where({ personne: personne.id })
        .update(preferences);
      return trx("email_notification_preferences")
        .select("assignment", "novelty", "arrival")
        .where({ personne: personne.id })
        .first();
    });
  }
  const personne = await db("auth_user").where({ id: userId, active: true }).first();
  if (!personne) return undefined;
  return db("email_notification_preferences")
    .select("assignment", "novelty", "arrival")
    .where({ personne: personne.id })
    .first();
}
