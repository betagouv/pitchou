import type { Knex } from "knex";

/**
 * TRUNCATE every public table except knex_migrations, restarting identity
 * and cascading FKs. Fast enough to run before each test.
 */
export async function truncateAll(db: Knex): Promise<void> {
  const { rows } = await db.raw<{ rows: { tablename: string }[] }>(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'knex_%'`,
  );
  if (rows.length === 0) return;

  const quoted = rows.map((r) => `"${r.tablename}"`).join(", ");
  await db.raw(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}
