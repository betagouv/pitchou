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

    -- Existing department edges already match the deployed routing policy.
    -- Preserve exceptional edges as explicit inclusions without recalculating data.
    INSERT INTO groupe_dossier_override (dossier, groupe_instructeurs, mode)
      SELECT e.dossier, e.groupe_instructeurs, 'include'
      FROM edge_groupe_instructeurs__dossier e JOIN dossier d ON d.id = e.dossier
      WHERE NOT EXISTS (SELECT 1 FROM groupe_departement c
        WHERE c.groupe_instructeurs = e.groupe_instructeurs AND c.department = d.primary_department);
  `);
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
