import type { Knex } from "knex";

/**
 * Reference data the migrations insert, not test fixtures: the referential of types d'impact,
 * méthodes and moyens de poursuite is part of creating the schema (ADR-0001). Emptying it would
 * leave every test running against an application with no specification to read.
 */
const TABLES_REFERENTIELLES = new Set([
  "impact_type",
  "impact_methode",
  "impact_moyen_de_poursuite",
]);

/**
 * TRUNCATE every public table except knex_migrations and the referential ones, restarting
 * identity and cascading FKs. Fast enough to run before each test.
 */
export async function truncateAll(db: Knex): Promise<void> {
  const { rows } = await db.raw<{ rows: { tablename: string }[] }>(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'knex_%'`,
  );

  const tables = rows.filter((r) => !TABLES_REFERENTIELLES.has(r.tablename));
  if (tables.length === 0) return;

  const quoted = tables.map((r) => `"${r.tablename}"`).join(", ");
  await db.raw(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}
