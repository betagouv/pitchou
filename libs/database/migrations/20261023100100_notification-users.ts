import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    DROP TRIGGER email_notification_preferences_insert ON personne;
    DELETE FROM email_notification_preferences WHERE personne NOT IN (SELECT id FROM auth_user);
    ALTER TABLE email_notification_preferences DROP CONSTRAINT email_notification_preferences_personne_foreign;
    ALTER TABLE email_notification_preferences ADD FOREIGN KEY (personne) REFERENCES auth_user(id) ON DELETE CASCADE;
    INSERT INTO email_notification_preferences (personne) SELECT id FROM auth_user ON CONFLICT DO NOTHING;
    CREATE TRIGGER email_notification_preferences_insert AFTER INSERT ON auth_user
      FOR EACH ROW EXECUTE FUNCTION initialize_email_notification_preferences();
  `);
  // Preserve the deployed queue/audit rules while moving account lookups to auth_user.
  for (const name of [
    "queue_pitchou_email_notification()",
    "pitchou_notification_cancellation(email_notification_outbox)",
    "audit_pitchou_notification()",
  ]) {
    const { rows } = await db.raw("SELECT pg_get_functiondef(?::regprocedure) AS definition", [
      name,
    ]);
    let definition = rows[0].definition.replaceAll(/\b(FROM|JOIN) personne\b/gu, "$1 auth_user");
    if (name.startsWith("pitchou_notification_cancellation")) {
      definition = definition.replace(
        "IF notification.kind <> 'arrival'",
        `IF notification.kind <> 'arrival' AND (
        NOT pitchou_can_instruct(notification.personne) OR NOT EXISTS (
          SELECT 1 FROM user_groupe m JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
          JOIN edge_groupe_instructeurs__dossier e ON e.groupe_instructeurs = g.id
          WHERE m.user_id = notification.personne AND e.dossier = notification.dossier
        )) THEN RETURN 'lost_access'; END IF;
      IF notification.kind <> 'arrival'`,
      );
    }
    await db.raw(definition);
  }
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
