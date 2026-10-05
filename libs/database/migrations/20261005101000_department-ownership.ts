import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    CREATE FUNCTION lock_pitchou_access() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_advisory_xact_lock(2105102026);
      RETURN NULL;
    END $$;

    CREATE FUNCTION pitchou_can_instruct(user_id integer) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM auth_user u WHERE u.id = user_id AND u.active)
        AND NOT EXISTS (SELECT 1 FROM auth_permission_exclusion p WHERE p.user_id = $1 AND p.permission IN ('dossier:read', 'dossier:instruct'))
        AND (EXISTS (SELECT 1 FROM auth_permission_bundle p WHERE p.user_id = $1 AND p.bundle IN ('instructeur', 'administrateur'))
          OR (SELECT count(DISTINCT p.permission) = 2 FROM auth_permission p WHERE p.user_id = $1 AND p.permission IN ('dossier:read', 'dossier:instruct')));
    $$;

    CREATE FUNCTION clean_pitchou_followers() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM edge_personne_follows_dossier f WHERE NOT EXISTS (
        SELECT 1 FROM auth_user u JOIN user_groupe m ON m.user_id = u.id
        JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
        JOIN edge_groupe_instructeurs__dossier e ON e.groupe_instructeurs = g.id
        WHERE u.id = f.personne AND pitchou_can_instruct(u.id) AND e.dossier = f.dossier
      );
      RETURN NULL;
    END $$;

    CREATE FUNCTION refresh_pitchou_ownership(target integer) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM edge_groupe_instructeurs__dossier e
      WHERE (target IS NULL OR e.dossier = target) AND NOT EXISTS (
        SELECT 1 FROM dossier d JOIN groupe_departement c ON c.department = d.primary_department
        JOIN groupe_instructeurs g ON g.id = c.groupe_instructeurs AND g.active
        WHERE d.id = e.dossier AND g.id = e.groupe_instructeurs
      );
      INSERT INTO edge_groupe_instructeurs__dossier (dossier, groupe_instructeurs)
      SELECT d.id, g.id FROM dossier d
      JOIN groupe_departement c ON c.department = d.primary_department
      JOIN groupe_instructeurs g ON g.id = c.groupe_instructeurs AND g.active
      WHERE target IS NULL OR d.id = target
      ON CONFLICT (dossier, groupe_instructeurs) DO NOTHING;
      DELETE FROM edge_personne_follows_dossier f
      WHERE (target IS NULL OR f.dossier = target) AND NOT EXISTS (
        SELECT 1 FROM auth_user u JOIN user_groupe m ON m.user_id = u.id
        JOIN edge_groupe_instructeurs__dossier e ON e.groupe_instructeurs = m.groupe_instructeurs
        WHERE u.id = f.personne AND pitchou_can_instruct(u.id) AND e.dossier = f.dossier
      );
    END $$;

    CREATE FUNCTION route_pitchou_dossier() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM refresh_pitchou_ownership(NEW.id);
      RETURN NEW;
    END $$;
    CREATE FUNCTION route_pitchou_groupes() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM refresh_pitchou_ownership(NULL);
      RETURN NULL;
    END $$;

    CREATE TRIGGER dossier_ownership_lock BEFORE INSERT OR UPDATE OF primary_department ON dossier
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER dossier_ownership AFTER INSERT OR UPDATE OF primary_department ON dossier
      FOR EACH ROW EXECUTE FUNCTION route_pitchou_dossier();
    CREATE TRIGGER department_ownership_lock BEFORE INSERT OR UPDATE OR DELETE ON groupe_departement
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER department_ownership AFTER INSERT OR UPDATE OR DELETE ON groupe_departement
      FOR EACH STATEMENT EXECUTE FUNCTION route_pitchou_groupes();
    CREATE TRIGGER groupe_ownership_lock BEFORE UPDATE OR DELETE ON groupe_instructeurs
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER groupe_ownership AFTER UPDATE OR DELETE ON groupe_instructeurs
      FOR EACH STATEMENT EXECUTE FUNCTION route_pitchou_groupes();
    CREATE TRIGGER membership_lock BEFORE INSERT OR UPDATE OR DELETE ON user_groupe
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER membership_followers AFTER INSERT OR UPDATE OR DELETE ON user_groupe
      FOR EACH STATEMENT EXECUTE FUNCTION clean_pitchou_followers();
    CREATE TRIGGER user_access_lock BEFORE UPDATE ON auth_user
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER user_followers AFTER UPDATE ON auth_user
      FOR EACH STATEMENT EXECUTE FUNCTION clean_pitchou_followers();
    CREATE TRIGGER permission_followers AFTER INSERT OR UPDATE OR DELETE ON auth_permission
      FOR EACH STATEMENT EXECUTE FUNCTION clean_pitchou_followers();
    CREATE TRIGGER bundle_followers AFTER INSERT OR UPDATE OR DELETE ON auth_permission_bundle
      FOR EACH STATEMENT EXECUTE FUNCTION clean_pitchou_followers();
    CREATE TRIGGER exclusion_followers AFTER INSERT OR UPDATE OR DELETE ON auth_permission_exclusion
      FOR EACH STATEMENT EXECUTE FUNCTION clean_pitchou_followers();
    CREATE TRIGGER permission_lock BEFORE INSERT OR UPDATE OR DELETE ON auth_permission
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER bundle_lock BEFORE INSERT OR UPDATE OR DELETE ON auth_permission_bundle
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    CREATE TRIGGER exclusion_lock BEFORE INSERT OR UPDATE OR DELETE ON auth_permission_exclusion
      FOR EACH STATEMENT EXECUTE FUNCTION lock_pitchou_access();
    SELECT refresh_pitchou_ownership(NULL);
  `);
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
