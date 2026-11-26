import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    CREATE TABLE external_api_all_dossiers_grant (
      client_id text NOT NULL REFERENCES external_api_client ON DELETE CASCADE,
      scope text NOT NULL CHECK (scope IN ('dossiers:read', 'dossiers:read:internal')),
      PRIMARY KEY (client_id, scope)
    );
  `);
}

export async function down(db: Knex) {
  await db.schema.dropTable("external_api_all_dossiers_grant");
}
