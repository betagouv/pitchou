import type { Knex } from "knex";

// Keep this list fixed: it describes what admin:write allowed at migration time.
const replacements = [
  "admin:dossiers:create",
  "admin:dossiers:update",
  "admin:dossiers:delete",
  "admin:dossiers:files",
  "admin:dossiers:species",
  "admin:activites:manage",
  "admin:especes:manage",
  "admin:changelog:create",
  "admin:changelog:update",
  "admin:changelog:delete",
  "admin:sync:run",
  "admin:sync:simulate",
];

export async function up(db: Knex) {
  for (const table of ["auth_permission", "auth_permission_exclusion"]) {
    await db.raw(
      `INSERT INTO ?? (user_id, permission)
      SELECT legacy.user_id, replacement.permission
      FROM ?? legacy CROSS JOIN unnest(?::text[]) AS replacement(permission)
      WHERE legacy.permission = 'admin:write'
      ON CONFLICT (user_id, permission) DO NOTHING`,
      [table, table, replacements],
    );
    await db(table).where({ permission: "admin:write" }).delete();
  }
}

export async function down() {
  throw new Error(
    "Granular permissions cannot be merged into admin:write without changing access. Restore the matching backup and application version.",
  );
}
