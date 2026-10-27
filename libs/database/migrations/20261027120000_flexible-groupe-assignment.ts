import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw("SELECT set_config('pitchou.notification_baseline', 'true', true)");
  await db.raw(`
    CREATE TABLE groupe_regle (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      groupe_instructeurs uuid NOT NULL REFERENCES groupe_instructeurs(id) ON DELETE CASCADE,
      departments text[] NOT NULL DEFAULT '{}',
      communes text[] NOT NULL DEFAULT '{}',
      activites text[] NOT NULL DEFAULT '{}',
      CHECK (cardinality(departments) + cardinality(communes) + cardinality(activites) > 0)
    );
    CREATE INDEX ON groupe_regle (groupe_instructeurs);
    CREATE TABLE groupe_dossier_override (
      groupe_instructeurs uuid NOT NULL REFERENCES groupe_instructeurs(id) ON DELETE CASCADE,
      dossier integer NOT NULL REFERENCES dossier(id) ON DELETE CASCADE,
      mode text NOT NULL CHECK (mode IN ('include', 'exclude')),
      PRIMARY KEY (groupe_instructeurs, dossier)
    );
    CREATE INDEX ON groupe_dossier_override (dossier);

    CREATE FUNCTION pitchou_rule_matches(d dossier, departments text[], communes text[], activites text[])
    RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT (cardinality(departments) = 0 OR d.primary_department = ANY(departments))
        AND (cardinality(communes) = 0 OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d.communes::jsonb) = 'array'
            THEN d.communes::jsonb ELSE '[]'::jsonb END) c WHERE c->>'code' = ANY(communes)))
        AND (cardinality(activites) = 0 OR COALESCE(
          (SELECT l.activite_code FROM activite_label l WHERE l.label = d.main_activite AND NOT l.needs_review),
          CASE WHEN NULLIF(d.main_activite, '') IS NOT NULL THEN 'autre' END) = ANY(activites));
    $$;
    CREATE FUNCTION pitchou_group_matches(d dossier, groupe uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM groupe_departement c
        WHERE c.groupe_instructeurs = groupe AND c.department = d.primary_department)
        OR EXISTS (SELECT 1 FROM groupe_regle r WHERE r.groupe_instructeurs = groupe
          AND pitchou_rule_matches(d, r.departments, r.communes, r.activites));
    $$;
    CREATE FUNCTION pitchou_group_owns(d dossier, groupe uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM groupe_instructeurs g WHERE g.id = groupe AND g.active)
        AND COALESCE((SELECT o.mode = 'include' FROM groupe_dossier_override o
          WHERE o.dossier = d.id AND o.groupe_instructeurs = groupe), pitchou_group_matches(d, groupe));
    $$;

    -- Preserve any existing exceptional edges independently of automatic rules.
    INSERT INTO groupe_dossier_override (dossier, groupe_instructeurs, mode)
      SELECT e.dossier, e.groupe_instructeurs, 'include'
      FROM edge_groupe_instructeurs__dossier e JOIN dossier d ON d.id = e.dossier
      WHERE NOT pitchou_group_matches(d, e.groupe_instructeurs);

    CREATE FUNCTION recalculate_pitchou_ownership(target integer, silent boolean) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM edge_groupe_instructeurs__dossier e USING dossier d
        WHERE d.id = e.dossier AND (target IS NULL OR d.id = target)
          AND NOT pitchou_group_owns(d, e.groupe_instructeurs);
      WITH inserted AS (INSERT INTO edge_groupe_instructeurs__dossier (dossier, groupe_instructeurs)
        SELECT d.id, candidates.groupe_instructeurs FROM dossier d
        JOIN LATERAL (
          SELECT c.groupe_instructeurs FROM groupe_departement c WHERE c.department = d.primary_department
          UNION SELECT r.groupe_instructeurs FROM groupe_regle r
            WHERE pitchou_rule_matches(d, r.departments, r.communes, r.activites)
          UNION SELECT o.groupe_instructeurs FROM groupe_dossier_override o
            WHERE o.dossier = d.id AND o.mode = 'include'
        ) candidates ON true
        WHERE (target IS NULL OR d.id = target) AND pitchou_group_owns(d, candidates.groupe_instructeurs)
        ON CONFLICT (dossier, groupe_instructeurs) DO NOTHING
        RETURNING dossier, groupe_instructeurs)
      INSERT INTO email_notification_groupe_arrival (dossier, groupe_instructeurs, revision)
        SELECT dossier, groupe_instructeurs, gen_random_uuid() FROM inserted WHERE silent
        ON CONFLICT (dossier, groupe_instructeurs) DO NOTHING;
      DELETE FROM edge_personne_follows_dossier f
        WHERE (target IS NULL OR f.dossier = target) AND NOT EXISTS (
          SELECT 1 FROM user_groupe m JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
          JOIN edge_groupe_instructeurs__dossier e ON e.groupe_instructeurs = m.groupe_instructeurs
          WHERE m.user_id = f.personne AND pitchou_can_instruct(m.user_id) AND e.dossier = f.dossier);
    END $$;

    CREATE OR REPLACE FUNCTION refresh_pitchou_ownership(target integer) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM recalculate_pitchou_ownership(target, false);
    END $$;

    CREATE OR REPLACE FUNCTION route_pitchou_groupes() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      -- Baseline only edges added by this recalculation. Later ordinary arrivals
      -- in the same transaction must still notify their recipients.
      PERFORM recalculate_pitchou_ownership(NULL, true);
      RETURN NULL;
    END $$;
    CREATE FUNCTION route_pitchou_override() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP <> 'INSERT' THEN PERFORM refresh_pitchou_ownership(OLD.dossier); END IF;
      IF TG_OP <> 'DELETE' THEN PERFORM refresh_pitchou_ownership(NEW.dossier); END IF;
      RETURN NULL;
    END $$;

    DROP TRIGGER dossier_ownership_lock ON dossier;
    DROP TRIGGER dossier_ownership ON dossier;
    CREATE TRIGGER dossier_ownership_lock BEFORE INSERT OR UPDATE OF primary_department, communes, main_activite ON dossier
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER dossier_ownership AFTER INSERT OR UPDATE OF primary_department, communes, main_activite ON dossier
      FOR EACH ROW EXECUTE FUNCTION route_pitchou_dossier();
    CREATE TRIGGER rule_ownership_lock BEFORE INSERT OR UPDATE OR DELETE ON groupe_regle
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER rule_ownership AFTER INSERT OR UPDATE OR DELETE ON groupe_regle
      FOR EACH STATEMENT EXECUTE FUNCTION route_pitchou_groupes();
    CREATE TRIGGER override_ownership_lock BEFORE INSERT OR UPDATE OR DELETE ON groupe_dossier_override
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER override_ownership AFTER INSERT OR UPDATE OR DELETE ON groupe_dossier_override
      FOR EACH ROW EXECUTE FUNCTION route_pitchou_override();
    CREATE TRIGGER activite_ownership_lock BEFORE INSERT OR UPDATE OR DELETE ON activite_label
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE FUNCTION route_pitchou_activite() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.needs_review THEN RETURN NULL; END IF;
      IF TG_OP = 'UPDATE' AND NEW.label = OLD.label AND NEW.activite_code = OLD.activite_code AND NEW.needs_review = OLD.needs_review THEN RETURN NULL; END IF;
      PERFORM recalculate_pitchou_ownership(NULL, true);
      RETURN NULL;
    END $$;
    CREATE TRIGGER activite_ownership AFTER INSERT OR UPDATE OR DELETE ON activite_label
      FOR EACH ROW EXECUTE FUNCTION route_pitchou_activite();
    SELECT refresh_pitchou_ownership(NULL);
  `);
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
