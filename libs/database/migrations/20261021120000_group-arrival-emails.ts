import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("email_notification_preferences", (table) => {
    table.boolean("arrival").notNullable().defaultTo(true);
  });
  await knex.schema.createTable("email_notification_groupe_arrival", (table) => {
    table.integer("dossier").primary().references("id").inTable("dossier").onDelete("CASCADE");
    table
      .uuid("groupe_instructeurs")
      .nullable()
      .references("id")
      .inTable("groupe_instructeurs")
      .onDelete("SET NULL");
    table.uuid("revision").notNullable().defaultTo(knex.fn.uuid());
  });
  // Remember existing assignments without emailing the historical backlog.
  await knex.raw(`
    INSERT INTO email_notification_groupe_arrival (dossier, groupe_instructeurs)
      SELECT dossier, groupe_instructeurs FROM edge_groupe_instructeurs__dossier;
    ALTER TABLE email_notification_outbox DROP CONSTRAINT email_notification_outbox_kind_check;
    ALTER TABLE email_notification_outbox ADD CONSTRAINT email_notification_outbox_kind_check
      CHECK (kind IN ('assignment', 'novelty', 'arrival'));

    CREATE OR REPLACE FUNCTION cancel_pitchou_email_notifications() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_TABLE_NAME = 'email_notification_preferences' THEN
        UPDATE email_notification_outbox SET status = 'cancelled', claimed_at = NULL
          WHERE personne = NEW.personne AND status = 'pending'
          AND ((kind = 'assignment' AND NOT NEW.assignment) OR (kind = 'novelty' AND NOT NEW.novelty));
        RETURN NEW;
      END IF;
      UPDATE email_notification_outbox SET status = 'cancelled', claimed_at = NULL
        WHERE personne = OLD.personne AND dossier = OLD.dossier AND status = 'pending' AND kind IN ('assignment', 'novelty');
      RETURN OLD;
    END $$;
    CREATE FUNCTION queue_pitchou_groupe_arrival_email() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      dossier_id integer;
      current_groupe uuid;
      previous_groupe uuid;
      arrival_revision uuid;
    BEGIN
      dossier_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.dossier ELSE NEW.dossier END;
      IF NOT EXISTS (SELECT 1 FROM dossier WHERE id = dossier_id) THEN RETURN NULL; END IF;
      -- Admin saves delete/reinsert the relation; DN upserts it on every sync.
      -- Deferred execution compares the final group, not those intermediate writes.
      SELECT groupe_instructeurs INTO current_groupe FROM edge_groupe_instructeurs__dossier
        WHERE dossier = dossier_id;
      INSERT INTO email_notification_groupe_arrival (dossier) VALUES (dossier_id)
        ON CONFLICT DO NOTHING;
      SELECT groupe_instructeurs INTO previous_groupe FROM email_notification_groupe_arrival
        WHERE dossier = dossier_id FOR UPDATE;
      IF current_groupe IS NOT DISTINCT FROM previous_groupe THEN RETURN NULL; END IF;
      arrival_revision := gen_random_uuid();
      UPDATE email_notification_groupe_arrival SET groupe_instructeurs = current_groupe,
        revision = arrival_revision WHERE dossier = dossier_id;
      UPDATE email_notification_outbox SET status = 'cancelled', claimed_at = NULL
        WHERE dossier = dossier_id AND kind = 'arrival' AND status = 'pending';
      IF current_groupe IS NULL THEN RETURN NULL; END IF;
      INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
      SELECT DISTINCT p.id, dossier_id, 'arrival', arrival_revision::text,
        date_trunc('milliseconds', clock_timestamp())
      FROM edge_cap_dossier__groupe_instructeurs cg
      JOIN cap_dossier c ON c.cap = cg.cap_dossier
      JOIN personne p ON p.access_code = c.personne_cap
      JOIN email_notification_preferences pref ON pref.personne = p.id
      WHERE cg.groupe_instructeurs = current_groupe AND pref.arrival AND p.email IS NOT NULL
      ON CONFLICT DO NOTHING;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER email_notification_groupe_transition
      AFTER INSERT OR UPDATE OR DELETE ON edge_groupe_instructeurs__dossier
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION queue_pitchou_groupe_arrival_email();
    CREATE FUNCTION cancel_pitchou_arrival_emails() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT NEW.arrival THEN
        UPDATE email_notification_outbox SET status = 'cancelled', claimed_at = NULL
          WHERE personne = NEW.personne AND kind = 'arrival' AND status = 'pending';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER email_notification_arrival_preferences_cancel
      AFTER UPDATE OF arrival ON email_notification_preferences
      FOR EACH ROW EXECUTE FUNCTION cancel_pitchou_arrival_emails();
  `);
}

export async function down(knex: Knex) {
  await knex.raw(`
    DROP TRIGGER email_notification_arrival_preferences_cancel ON email_notification_preferences;
    DROP FUNCTION cancel_pitchou_arrival_emails();
    DROP TRIGGER email_notification_groupe_transition ON edge_groupe_instructeurs__dossier;
    DROP FUNCTION queue_pitchou_groupe_arrival_email();

    CREATE OR REPLACE FUNCTION cancel_pitchou_email_notifications() RETURNS trigger LANGUAGE plpgsql AS $$
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
    DELETE FROM email_notification_outbox WHERE kind = 'arrival';
    ALTER TABLE email_notification_outbox DROP CONSTRAINT email_notification_outbox_kind_check;
    ALTER TABLE email_notification_outbox ADD CONSTRAINT email_notification_outbox_kind_check
      CHECK (kind IN ('assignment', 'novelty'));
  `);
  await knex.schema.dropTable("email_notification_groupe_arrival");
  await knex.schema.alterTable("email_notification_preferences", (table) =>
    table.dropColumn("arrival"),
  );
}
