import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw("SELECT set_config('pitchou.notification_baseline', 'true', true)");
  // Earlier migrations in the same batch may have queued group transitions.
  // Drain them silently before altering the table, then restore deferred delivery.
  await db.raw("SET CONSTRAINTS email_notification_groupe_transition IMMEDIATE");
  await db.raw("SET CONSTRAINTS email_notification_groupe_transition DEFERRED");
  await db.raw(`
    ALTER TABLE groupe_regle ADD COLUMN access_level text NOT NULL DEFAULT 'instruct'
      CHECK (access_level IN ('read', 'instruct'));
    ALTER TABLE groupe_dossier_override ADD COLUMN access_level text NOT NULL DEFAULT 'instruct'
      CHECK (access_level IN ('read', 'instruct'));
    ALTER TABLE edge_groupe_instructeurs__dossier ADD COLUMN access_level text NOT NULL DEFAULT 'instruct'
      CHECK (access_level IN ('read', 'instruct'));
    CREATE TABLE dossier_user_access (
      dossier integer NOT NULL REFERENCES dossier(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
      access_level text NOT NULL DEFAULT 'instruct' CHECK (access_level IN ('read', 'instruct')),
      PRIMARY KEY (dossier, user_id)
    );
    CREATE INDEX ON dossier_user_access (user_id);

    CREATE FUNCTION pitchou_can_read(user_id integer) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM auth_user u WHERE u.id = $1 AND u.active)
        AND NOT EXISTS (SELECT 1 FROM auth_permission_exclusion p
          WHERE p.user_id = $1 AND p.permission = 'dossier:read')
        AND (EXISTS (SELECT 1 FROM auth_permission_bundle p
            WHERE p.user_id = $1 AND p.bundle IN ('instructeur', 'administrateur'))
          OR EXISTS (SELECT 1 FROM auth_permission p WHERE p.user_id = $1 AND p.permission = 'dossier:read'));
    $$;
    CREATE FUNCTION pitchou_group_access(d dossier, groupe uuid) RETURNS text LANGUAGE sql STABLE AS $$
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM groupe_instructeurs g WHERE g.id = groupe AND g.active) THEN NULL
        WHEN o.mode = 'exclude' THEN NULL
        WHEN o.mode = 'include' THEN o.access_level
        WHEN EXISTS (SELECT 1 FROM groupe_departement c
          WHERE c.groupe_instructeurs = groupe AND c.department = d.primary_department) THEN 'instruct'
        ELSE (SELECT CASE WHEN bool_or(r.access_level = 'instruct') THEN 'instruct' ELSE 'read' END
          FROM groupe_regle r WHERE r.groupe_instructeurs = groupe
            AND pitchou_rule_matches(d, r.departments, r.communes, r.activites)
          HAVING count(*) > 0) END
      FROM (SELECT 1) singleton LEFT JOIN groupe_dossier_override o
        ON o.dossier = d.id AND o.groupe_instructeurs = groupe;
    $$;
    CREATE OR REPLACE FUNCTION pitchou_group_owns(d dossier, groupe uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT pitchou_group_access(d, groupe) IS NOT NULL;
    $$;
    CREATE FUNCTION pitchou_dossier_access(target_dossier integer, target_user integer)
    RETURNS text LANGUAGE sql STABLE AS $$
      WITH grants AS (
        SELECT e.access_level FROM edge_groupe_instructeurs__dossier e
        JOIN user_groupe m ON m.groupe_instructeurs = e.groupe_instructeurs
        JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
        WHERE e.dossier = target_dossier AND m.user_id = target_user
        UNION ALL SELECT a.access_level FROM dossier_user_access a
          WHERE a.dossier = target_dossier AND a.user_id = target_user
      )
      SELECT CASE WHEN NOT pitchou_can_read(target_user)
          OR NOT EXISTS (SELECT 1 FROM dossier WHERE id = target_dossier) THEN NULL
        WHEN EXISTS (SELECT 1 FROM grants WHERE access_level = 'instruct') AND pitchou_can_instruct(target_user)
          THEN 'complet'
        WHEN EXISTS (SELECT 1 FROM grants) THEN 'lecture_complete'
        WHEN EXISTS (SELECT 1 FROM user_groupe m JOIN groupe_instructeurs g
          ON g.id = m.groupe_instructeurs AND g.active WHERE m.user_id = target_user) THEN 'lecture'
        ELSE NULL END;
    $$;
    CREATE OR REPLACE FUNCTION clean_pitchou_followers() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM edge_personne_follows_dossier f
        WHERE pitchou_dossier_access(f.dossier, f.personne) IS NULL;
      RETURN NULL;
    END $$;
    CREATE TRIGGER direct_access_lock BEFORE INSERT OR UPDATE OR DELETE ON dossier_user_access
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER direct_access_followers AFTER INSERT OR UPDATE OR DELETE ON dossier_user_access
      FOR EACH STATEMENT EXECUTE FUNCTION clean_pitchou_followers();

    CREATE FUNCTION pitchou_notification_action_visible(a action_dossier, restricted boolean)
    RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT COALESCE(a.data->>'baseline', 'false') <> 'true'
        AND COALESCE(a.data->>'notification_legacy', 'false') <> 'true'
        AND COALESCE(a.data->>'email_notification', 'true') <> 'false'
        AND COALESCE((a.author_petitionnaire AND a.data->>'notification' = 'true')
          OR (NOT a.author_petitionnaire AND a.author_personne IS NOT NULL AND
            ((restricted AND a.type = 'phase_renseignee') OR (NOT restricted AND a.type IN (
              'phase_renseignee', 'prochaine_action_renseignee', 'echeance_renseignee',
              'ddep_renseignee', 'enjeu_renseigne', 'onagre_renseigne', 'dates_consultation_renseignees',
              'commentaire_ajoute', 'commentaire_modifie', 'commentaire_supprime',
              'piece_jointe_importee', 'saisine_importee', 'avis_importe', 'avis_modifie', 'avis_supprime',
              'decision_importee', 'decision_modifiee', 'decision_supprimee',
              'prescription_ajoutee', 'prescription_modifiee', 'prescription_supprimee',
              'controle_ajoute', 'controle_modifie', 'controle_supprime', 'controle_retour_conformite'
            )))), false);
    $$;
    CREATE FUNCTION pitchou_notification_eligible(target_dossier integer, target_user integer, target_batch text)
    RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT CASE pitchou_dossier_access(target_dossier, target_user)
        WHEN 'complet' THEN true WHEN 'lecture_complete' THEN true
        WHEN 'lecture' THEN EXISTS (SELECT 1 FROM action_dossier a
          WHERE a.dossier = target_dossier AND pitchou_notification_action_visible(a, true)
            AND (a.author_personne IS NULL OR a.author_personne <> target_user)
            AND (next_pitchou_email_delivery(a.created_at) AT TIME ZONE 'Europe/Paris')::date::text = target_batch)
        ELSE false END;
    $$;
    CREATE OR REPLACE FUNCTION queue_pitchou_email_notification() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      action action_dossier%ROWTYPE;
      delivery_time timestamptz;
    BEGIN
      -- Deferred execution reads the final action, including sync baseline markers.
      SELECT * INTO action FROM action_dossier WHERE id = NEW.id;
      IF NOT FOUND OR action.data->>'baseline' = 'true' OR action.data->>'notification_legacy' = 'true'
        OR action.data->>'email_notification' = 'false' THEN RETURN NEW; END IF;
      IF action.type = 'dossier_suivi' AND action.author_personne IS NOT NULL THEN
        INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
          SELECT f.personne, f.dossier, 'assignment', action.id::text, date_trunc('milliseconds', clock_timestamp())
          FROM edge_personne_follows_dossier f JOIN auth_user u ON u.id = f.personne
          JOIN email_notification_preferences pref ON pref.personne = u.id
          WHERE f.dossier = action.dossier AND u.email = action.data->>'follower'
            AND u.id <> action.author_personne AND pref.assignment
            AND pitchou_dossier_access(f.dossier, f.personne) IS NOT NULL
          ON CONFLICT DO NOTHING;
        RETURN NEW;
      END IF;
      IF NOT pitchou_notification_action_visible(action, false) THEN RETURN NEW; END IF;
      delivery_time := next_pitchou_email_delivery(action.created_at);
      INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
        SELECT f.personne, f.dossier, 'novelty',
          (delivery_time AT TIME ZONE 'Europe/Paris')::date::text, delivery_time
        FROM edge_personne_follows_dossier f
        JOIN email_notification_preferences pref ON pref.personne = f.personne
        WHERE f.dossier = action.dossier AND pref.novelty
          AND (action.author_personne IS NULL OR action.author_personne <> f.personne)
          AND pitchou_dossier_access(f.dossier, f.personne) IS NOT NULL
          AND pitchou_notification_action_visible(action, pitchou_dossier_access(f.dossier, f.personne) = 'lecture')
        ON CONFLICT (personne, dossier, kind, batch_key) DO UPDATE SET status = 'pending'
          WHERE email_notification_outbox.status = 'cancelled' AND email_notification_outbox.first_attempt_at IS NULL;
      RETURN NEW;
    END $$;

    CREATE OR REPLACE FUNCTION recalculate_pitchou_ownership(target integer, silent boolean)
    RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM edge_groupe_instructeurs__dossier e USING dossier d
        WHERE d.id = e.dossier AND (target IS NULL OR d.id = target)
          AND pitchou_group_access(d, e.groupe_instructeurs) IS NULL;
      -- Keep surviving edges, follows and arrival revisions when only the level changes.
      UPDATE edge_groupe_instructeurs__dossier e
        SET access_level = pitchou_group_access(d, e.groupe_instructeurs)
        FROM dossier d WHERE d.id = e.dossier AND (target IS NULL OR d.id = target)
          AND e.access_level IS DISTINCT FROM pitchou_group_access(d, e.groupe_instructeurs);
      WITH inserted AS (INSERT INTO edge_groupe_instructeurs__dossier (dossier, groupe_instructeurs, access_level)
        SELECT d.id, candidates.groupe_instructeurs, pitchou_group_access(d, candidates.groupe_instructeurs)
        FROM dossier d JOIN LATERAL (
          SELECT c.groupe_instructeurs FROM groupe_departement c WHERE c.department = d.primary_department
          UNION SELECT r.groupe_instructeurs FROM groupe_regle r
            WHERE pitchou_rule_matches(d, r.departments, r.communes, r.activites)
          UNION SELECT o.groupe_instructeurs FROM groupe_dossier_override o
            WHERE o.dossier = d.id AND o.mode = 'include'
        ) candidates ON true
        WHERE (target IS NULL OR d.id = target) AND pitchou_group_access(d, candidates.groupe_instructeurs) IS NOT NULL
        ON CONFLICT (dossier, groupe_instructeurs) DO NOTHING
        RETURNING dossier, groupe_instructeurs)
      INSERT INTO email_notification_groupe_arrival (dossier, groupe_instructeurs, revision)
        SELECT dossier, groupe_instructeurs, gen_random_uuid() FROM inserted WHERE silent
        ON CONFLICT (dossier, groupe_instructeurs) DO NOTHING;
      DELETE FROM edge_personne_follows_dossier f
        WHERE (target IS NULL OR f.dossier = target) AND pitchou_dossier_access(f.dossier, f.personne) IS NULL;
    END $$;

    CREATE OR REPLACE FUNCTION pitchou_notification_cancellation(notification email_notification_outbox)
    RETURNS text LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM dossier WHERE id = notification.dossier) THEN RETURN 'dossier_deleted'; END IF;
      IF NOT EXISTS (SELECT 1 FROM auth_user WHERE id = notification.personne) THEN RETURN 'recipient_deleted'; END IF;
      IF EXISTS (SELECT 1 FROM email_notification_preferences pref WHERE pref.personne = notification.personne AND
        ((notification.kind = 'arrival' AND NOT pref.arrival) OR (notification.kind = 'assignment' AND NOT pref.assignment)
          OR (notification.kind = 'novelty' AND NOT pref.novelty))) THEN RETURN 'disabled_preference'; END IF;
      IF pitchou_dossier_access(notification.dossier, notification.personne) IS NULL THEN RETURN 'lost_access'; END IF;
      IF notification.kind = 'novelty' AND NOT pitchou_notification_eligible(notification.dossier, notification.personne, notification.batch_key)
        THEN RETURN 'lost_access'; END IF;
      IF notification.kind <> 'arrival' AND NOT EXISTS (SELECT 1 FROM edge_personne_follows_dossier
        WHERE personne = notification.personne AND dossier = notification.dossier) THEN RETURN 'unfollowed_dossier'; END IF;
      IF notification.kind = 'arrival' AND NOT EXISTS (SELECT 1 FROM email_notification_groupe_arrival
        WHERE dossier = notification.dossier AND revision::text = notification.batch_key AND groupe_instructeurs IS NOT NULL)
        THEN RETURN 'transferred_group'; END IF;
      IF NOT EXISTS (SELECT 1 FROM auth_user WHERE id = notification.personne AND email IS NOT NULL)
        THEN RETURN 'missing_recipient_address'; END IF;
      RETURN 'lost_access';
    END $$;
    SELECT recalculate_pitchou_ownership(NULL, true);
  `);
  // Preserve all existing arrival/audit behavior while allowing read-only recipients.
  const { rows } = await db.raw(
    "SELECT pg_get_functiondef('queue_pitchou_groupe_arrival_email()'::regprocedure) AS definition",
  );
  const definition = rows[0].definition.replace(
    "pitchou_can_instruct(u.id)",
    "pitchou_dossier_access(dossier_id, u.id) IS NOT NULL",
  );
  if (definition === rows[0].definition) throw new Error("Expected arrival access validator");
  await db.raw(definition);
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
