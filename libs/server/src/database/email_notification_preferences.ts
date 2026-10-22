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
      await trx.raw("SELECT set_config('pitchou.settings_actor', ?, true)", [String(userId)]);
      await trx("email_notification_preferences").where({ personne: userId }).forUpdate().first();
      await trx("email_notification_preferences").where({ personne: userId }).update(preferences);
      return trx("email_notification_preferences")
        .select("assignment", "novelty", "arrival")
        .where({ personne: userId })
        .first();
    });
  }
  return db("email_notification_preferences")
    .select("assignment", "novelty", "arrival")
    .where({ personne: userId })
    .first();
}
