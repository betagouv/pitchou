import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(`
    CREATE FUNCTION pitchou_notification_environment() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT CASE
        WHEN current_database() ~ '^pitchou_[a-f0-9]{32}$' THEN 'preview'
        WHEN current_database() LIKE 'pitchou_test%' THEN 'test'
        WHEN current_setting('pitchou.environment', true) IN ('production','staging','development','test','preview')
          THEN current_setting('pitchou.environment', true)
        ELSE 'production' END;
    $$;
    ALTER TABLE email_notification_outbox
      ADD COLUMN attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      ADD COLUMN provider_message_id text,
      ADD COLUMN cancellation_reason text,
      ADD COLUMN environment text NOT NULL DEFAULT pitchou_notification_environment(),
      ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
    UPDATE email_notification_outbox SET last_error = 'legacy_error' WHERE last_error IS NOT NULL;
    CREATE TABLE email_notification_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      notification_id uuid NOT NULL,
      personne integer NOT NULL,
      dossier integer NOT NULL,
      kind text NOT NULL,
      event text NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      environment text NOT NULL,
      attempt integer NOT NULL,
      details jsonb NOT NULL
    );
    CREATE INDEX ON email_notification_history (notification_id, occurred_at);
    CREATE INDEX ON email_notification_history (occurred_at DESC);
    CREATE INDEX ON email_notification_outbox (due_at DESC, id);
    CREATE INDEX ON email_notification_outbox (kind, status, environment, due_at);
    CREATE TABLE email_notification_settings_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      personne integer NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      environment text NOT NULL,
      changes jsonb NOT NULL
    );
    CREATE FUNCTION pitchou_notification_cancellation(notification email_notification_outbox) RETURNS text LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM dossier WHERE id = notification.dossier) THEN RETURN 'dossier_deleted'; END IF;
      IF NOT EXISTS (SELECT 1 FROM auth_user WHERE id = notification.personne) THEN RETURN 'recipient_deleted'; END IF;
      IF EXISTS (SELECT 1 FROM email_notification_preferences pref WHERE pref.personne = notification.personne AND
        ((notification.kind = 'arrival' AND NOT pref.arrival) OR (notification.kind = 'assignment' AND NOT pref.assignment)
          OR (notification.kind = 'novelty' AND NOT pref.novelty))) THEN RETURN 'disabled_preference'; END IF;
      IF notification.kind = 'arrival' AND NOT EXISTS (SELECT 1 FROM email_notification_groupe_arrival
        WHERE dossier = notification.dossier AND revision::text = notification.batch_key
          AND groupe_instructeurs IN (SELECT groupe_instructeurs FROM edge_groupe_instructeurs__dossier
            WHERE dossier = notification.dossier))
        THEN RETURN 'transferred_group'; END IF;
      IF NOT EXISTS (SELECT 1 FROM auth_user u
        JOIN user_groupe m ON m.user_id = u.id
        JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
        JOIN edge_groupe_instructeurs__dossier e ON e.groupe_instructeurs = g.id
        WHERE u.id = notification.personne AND pitchou_can_instruct(u.id) AND e.dossier = notification.dossier)
        THEN RETURN 'lost_access'; END IF;
      IF notification.kind <> 'arrival' AND NOT EXISTS (SELECT 1 FROM edge_personne_follows_dossier
        WHERE personne = notification.personne AND dossier = notification.dossier) THEN RETURN 'unfollowed_dossier'; END IF;
      IF NOT EXISTS (SELECT 1 FROM auth_user WHERE id = notification.personne AND email IS NOT NULL)
        THEN RETURN 'missing_recipient_address'; END IF;
      RETURN 'lost_access';
    END $$;
    CREATE FUNCTION prepare_pitchou_notification_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.cancellation_reason := pitchou_notification_cancellation(NEW);
      ELSIF NEW.status = 'pending' AND OLD.status = 'cancelled' THEN
        NEW.cancellation_reason := NULL;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER email_notification_audit_prepare BEFORE UPDATE ON email_notification_outbox
      FOR EACH ROW EXECUTE FUNCTION prepare_pitchou_notification_audit();
    CREATE FUNCTION audit_pitchou_notification() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      notification email_notification_outbox;
      event_name text;
      history_id uuid := gen_random_uuid();
      happened_at timestamptz := clock_timestamp();
      metadata jsonb;
    BEGIN
      IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'pending' THEN RETURN OLD; END IF;
        notification := OLD;
        notification.cancellation_reason := pitchou_notification_cancellation(OLD);
        event_name := 'cancelled';
      ELSE
        notification := NEW;
        IF TG_OP = 'INSERT' THEN event_name := 'queued';
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'pending' THEN event_name := 'queued';
        ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('sent','cancelled','uncertain') THEN event_name := NEW.status;
        ELSIF NEW.attempt_count > OLD.attempt_count THEN event_name := 'attempted';
        ELSIF OLD.claimed_at IS NOT NULL AND NEW.claimed_at IS NULL AND NEW.status = 'pending' AND NEW.last_error IS NOT NULL
          THEN event_name := 'failed';
        ELSE RETURN NEW; END IF;
      END IF;
      metadata := jsonb_build_object('notificationId', notification.id, 'type', notification.kind,
        'recipientId', notification.personne, 'dossierId', notification.dossier, 'scheduledAt', notification.due_at,
        'occurredAt', happened_at, 'attempt', notification.attempt_count, 'environment', notification.environment,
        'source', 'system', 'attribution', 'recipient');
      IF event_name = 'sent' THEN metadata := metadata || jsonb_build_object('providerMessageId', notification.provider_message_id); END IF;
      IF event_name IN ('failed','uncertain') THEN metadata := metadata || jsonb_build_object('errorCategory', notification.last_error); END IF;
      IF event_name = 'cancelled' THEN metadata := metadata || jsonb_build_object('reason', notification.cancellation_reason); END IF;
      INSERT INTO email_notification_history (id, notification_id, personne, dossier, kind, event, occurred_at, environment, attempt, details)
        VALUES (history_id, notification.id, notification.personne, notification.dossier, notification.kind, event_name,
          happened_at, notification.environment, notification.attempt_count, metadata);
      IF event_name <> 'attempted' AND EXISTS (SELECT 1 FROM auth_user WHERE id = notification.personne) THEN
        INSERT INTO evenement_metrique (id, personne, date, evenement, details)
          VALUES (history_id, notification.personne, happened_at, 'notificationEmail' || initcap(event_name), metadata);
      END IF;
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END $$;
    CREATE TRIGGER email_notification_audit AFTER INSERT OR UPDATE OR DELETE ON email_notification_outbox
      FOR EACH ROW EXECUTE FUNCTION audit_pitchou_notification();
    CREATE FUNCTION audit_pitchou_notification_settings() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      changes jsonb := '{}'::jsonb;
      preference text;
      event_id uuid := gen_random_uuid();
      happened_at timestamptz := clock_timestamp();
      actor text := current_setting('pitchou.settings_actor', true);
      activity_environment text := pitchou_notification_environment();
    BEGIN
      FOREACH preference IN ARRAY ARRAY['arrival','assignment','novelty'] LOOP
        IF to_jsonb(OLD)->preference IS DISTINCT FROM to_jsonb(NEW)->preference THEN
          changes := changes || jsonb_build_object(preference,
            jsonb_build_object('previous', to_jsonb(OLD)->preference, 'new', to_jsonb(NEW)->preference));
        END IF;
      END LOOP;
      IF changes = '{}'::jsonb THEN RETURN NEW; END IF;
      INSERT INTO email_notification_settings_history (id, personne, occurred_at, environment, changes)
        VALUES (event_id, NEW.personne, happened_at, activity_environment, changes);
      -- Only the authenticated settings endpoint marks this as a user action.
      IF actor = NEW.personne::text THEN
        INSERT INTO evenement_metrique (id, personne, date, evenement, details)
          VALUES (event_id, NEW.personne, happened_at, 'notificationEmailSettingsChanged',
            jsonb_build_object('personneId', NEW.personne, 'changes', changes, 'occurredAt', happened_at,
              'environment', activity_environment, 'source', 'user'));
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER email_notification_settings_audit AFTER UPDATE ON email_notification_preferences
      FOR EACH ROW EXECUTE FUNCTION audit_pitchou_notification_settings();
  `);
}

export async function down(knex: Knex) {
  await knex.raw(`
    DROP TRIGGER email_notification_settings_audit ON email_notification_preferences;
    DROP FUNCTION audit_pitchou_notification_settings();
    DROP TRIGGER email_notification_audit ON email_notification_outbox;
    DROP TRIGGER email_notification_audit_prepare ON email_notification_outbox;
    DROP FUNCTION audit_pitchou_notification();
    DROP FUNCTION prepare_pitchou_notification_audit();
    DROP FUNCTION pitchou_notification_cancellation(email_notification_outbox);
    DROP TABLE email_notification_settings_history;
    DROP TABLE email_notification_history;
    DROP INDEX email_notification_outbox_due_at_id_idx;
    DROP INDEX email_notification_outbox_kind_status_environment_due_at_idx;
    ALTER TABLE email_notification_outbox DROP COLUMN attempt_count, DROP COLUMN provider_message_id,
      DROP COLUMN cancellation_reason, DROP COLUMN environment, DROP COLUMN created_at;
    DROP FUNCTION pitchou_notification_environment();
  `);
}
