import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    ALTER TABLE email_notification_groupe_arrival DROP CONSTRAINT email_notification_groupe_arrival_pkey;
    DELETE FROM email_notification_groupe_arrival WHERE groupe_instructeurs IS NULL;
    ALTER TABLE email_notification_groupe_arrival ALTER COLUMN groupe_instructeurs SET NOT NULL;
    ALTER TABLE email_notification_groupe_arrival ADD PRIMARY KEY (dossier, groupe_instructeurs);
    ALTER TABLE email_notification_groupe_arrival DROP CONSTRAINT email_notification_groupe_arrival_groupe_instructeurs_foreign;
    ALTER TABLE email_notification_groupe_arrival ADD FOREIGN KEY (groupe_instructeurs)
      REFERENCES groupe_instructeurs(id) ON DELETE CASCADE;

    CREATE OR REPLACE FUNCTION queue_pitchou_groupe_arrival_email() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      dossier_id integer;
      added_groupe uuid;
      arrival_revision uuid;
    BEGIN
      dossier_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.dossier ELSE NEW.dossier END;
      IF NOT EXISTS (SELECT 1 FROM dossier WHERE id = dossier_id) THEN RETURN NULL; END IF;
      -- Compare the final set of groups after all writes in this transaction.
      PERFORM 1 FROM dossier WHERE id = dossier_id FOR UPDATE;
      DELETE FROM email_notification_groupe_arrival a WHERE a.dossier = dossier_id
        AND NOT EXISTS (SELECT 1 FROM edge_groupe_instructeurs__dossier e
          WHERE e.dossier = a.dossier AND e.groupe_instructeurs = a.groupe_instructeurs);
      UPDATE email_notification_outbox n SET status = 'cancelled', claimed_at = NULL
        WHERE n.dossier = dossier_id AND kind = 'arrival' AND status = 'pending'
        AND NOT EXISTS (SELECT 1 FROM email_notification_groupe_arrival a
          WHERE a.dossier = dossier_id AND a.revision::text = n.batch_key);
      arrival_revision := gen_random_uuid();
      FOR added_groupe IN
        SELECT e.groupe_instructeurs FROM edge_groupe_instructeurs__dossier e
        WHERE e.dossier = dossier_id AND NOT EXISTS (SELECT 1 FROM email_notification_groupe_arrival a
          WHERE a.dossier = e.dossier AND a.groupe_instructeurs = e.groupe_instructeurs)
      LOOP
        INSERT INTO email_notification_groupe_arrival (dossier, groupe_instructeurs, revision)
          VALUES (dossier_id, added_groupe, arrival_revision);
        IF current_setting('pitchou.notification_baseline', true) = 'true' THEN CONTINUE; END IF;
        INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
          SELECT DISTINCT u.id, dossier_id, 'arrival', arrival_revision::text,
            date_trunc('milliseconds', clock_timestamp())
          FROM user_groupe m JOIN auth_user u ON u.id = m.user_id
          JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
          JOIN email_notification_preferences pref ON pref.personne = u.id
          WHERE m.groupe_instructeurs = added_groupe AND pref.arrival AND u.email IS NOT NULL
            AND pitchou_can_instruct(u.id)
          ON CONFLICT DO NOTHING;
      END LOOP;
      RETURN NULL;
    END $$;
  `);
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
