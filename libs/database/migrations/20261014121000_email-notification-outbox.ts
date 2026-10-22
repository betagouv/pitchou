import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("email_notification_outbox", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .integer("personne")
      .notNullable()
      .references("id")
      .inTable("auth_user")
      .onDelete("CASCADE");
    table.integer("dossier").notNullable().references("id").inTable("dossier").onDelete("CASCADE");
    table.text("kind").notNullable();
    table.text("batch_key").notNullable();
    table.timestamp("due_at", { useTz: true }).notNullable();
    table.timestamp("retry_at", { useTz: true }).nullable();
    table.timestamp("claimed_at", { useTz: true }).nullable();
    table.timestamp("first_attempt_at", { useTz: true }).nullable();
    table.timestamp("sent_at", { useTz: true }).nullable();
    table.text("status").notNullable().defaultTo("pending");
    table.text("last_error").nullable();
    table.jsonb("message").nullable();
    table.unique(["personne", "dossier", "kind", "batch_key"]);
    table.index(["status", "due_at"]);
  });
  await knex.raw(`
    ALTER TABLE email_notification_outbox ADD CHECK (kind IN ('assignment', 'novelty'));
    ALTER TABLE email_notification_outbox ADD CHECK (status IN ('pending', 'sent', 'cancelled', 'uncertain'));
    CREATE FUNCTION cancel_pitchou_email_notifications() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_TABLE_NAME = 'email_notification_preferences' THEN
        UPDATE email_notification_outbox SET status = 'cancelled', claimed_at = NULL
        WHERE personne = NEW.personne AND status = 'pending'
          AND ((kind = 'assignment' AND NOT NEW.assignment) OR (kind = 'novelty' AND NOT NEW.novelty));
        RETURN NEW;
      END IF;
      UPDATE email_notification_outbox SET status = 'cancelled', claimed_at = NULL
        WHERE personne = OLD.personne AND dossier = OLD.dossier AND status = 'pending';
      RETURN OLD;
    END $$;
    CREATE TRIGGER email_notification_preferences_cancel AFTER UPDATE ON email_notification_preferences
      FOR EACH ROW EXECUTE FUNCTION cancel_pitchou_email_notifications();
    CREATE TRIGGER email_notification_unfollow_cancel AFTER DELETE ON edge_personne_follows_dossier
      FOR EACH ROW EXECUTE FUNCTION cancel_pitchou_email_notifications();
    CREATE FUNCTION next_pitchou_email_delivery(detected_at timestamptz) RETURNS timestamptz
      LANGUAGE SQL IMMUTABLE AS $$
      SELECT (date_trunc('day', detected_at AT TIME ZONE 'Europe/Paris') + interval '6 hours'
        + CASE WHEN (detected_at AT TIME ZONE 'Europe/Paris')::time >= time '06:00'
          THEN interval '1 day' ELSE interval '0 days' END) AT TIME ZONE 'Europe/Paris';
    $$;
    CREATE FUNCTION queue_pitchou_email_notification() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      action action_dossier%ROWTYPE;
      next_morning timestamp;
      delivery_time timestamptz;
    BEGIN
      -- Read the final row: the DN sync marks initial imports as baseline before commit.
      SELECT * INTO action FROM action_dossier WHERE id = NEW.id;
      IF NOT FOUND OR action.data->>'baseline' = 'true'
        OR action.data->>'notification_legacy' = 'true'
        OR action.data->>'email_notification' = 'false' THEN RETURN NEW; END IF;
      IF action.type = 'dossier_suivi' AND action.author_personne IS NOT NULL THEN
        INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
        SELECT f.personne, f.dossier, 'assignment', action.id::text, date_trunc('milliseconds', clock_timestamp())
        FROM edge_personne_follows_dossier f
        JOIN auth_user p ON p.id = f.personne
        JOIN email_notification_preferences pref ON pref.personne = p.id
        WHERE f.dossier = action.dossier AND p.email = action.data->>'follower'
          AND p.id <> action.author_personne AND pref.assignment
        ON CONFLICT DO NOTHING;
        RETURN NEW;
      END IF;
      IF NOT COALESCE((
        (action.author_petitionnaire AND action.data->>'notification' = 'true')
        OR (NOT action.author_petitionnaire AND action.author_personne IS NOT NULL AND action.type IN (
          'phase_renseignee', 'prochaine_action_renseignee', 'echeance_renseignee',
          'ddep_renseignee', 'enjeu_renseigne', 'onagre_renseigne', 'dates_consultation_renseignees',
          'commentaire_ajoute', 'commentaire_modifie', 'commentaire_supprime',
          'piece_jointe_importee', 'saisine_importee', 'avis_importe', 'avis_modifie', 'avis_supprime',
          'decision_importee', 'decision_modifiee', 'decision_supprimee',
          'prescription_ajoutee', 'prescription_modifiee', 'prescription_supprimee',
          'controle_ajoute', 'controle_modifie', 'controle_supprime', 'controle_retour_conformite'
        ))
      ), false) THEN RETURN NEW; END IF;
      delivery_time := next_pitchou_email_delivery(clock_timestamp());
      next_morning := delivery_time AT TIME ZONE 'Europe/Paris';
      INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
      SELECT f.personne, f.dossier, 'novelty', next_morning::date::text, delivery_time
      FROM edge_personne_follows_dossier f
      JOIN email_notification_preferences pref ON pref.personne = f.personne
      WHERE f.dossier = action.dossier AND pref.novelty
        AND (action.author_personne IS NULL OR action.author_personne <> f.personne)
      ON CONFLICT (personne, dossier, kind, batch_key) DO UPDATE SET status = 'pending'
        WHERE email_notification_outbox.status = 'cancelled' AND email_notification_outbox.first_attempt_at IS NULL;
      RETURN NEW;
    END $$;
    CREATE CONSTRAINT TRIGGER email_notification_action_insert AFTER INSERT ON action_dossier
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION queue_pitchou_email_notification();
  `);
}

export async function down(knex: Knex) {
  await knex.raw(`
    DROP TRIGGER email_notification_preferences_cancel ON email_notification_preferences;
    DROP TRIGGER email_notification_unfollow_cancel ON edge_personne_follows_dossier;
    DROP FUNCTION cancel_pitchou_email_notifications();
    DROP TRIGGER email_notification_action_insert ON action_dossier;
    DROP FUNCTION queue_pitchou_email_notification();
    DROP FUNCTION next_pitchou_email_delivery(timestamptz);
  `);
  await knex.schema.dropTable("email_notification_outbox");
}
