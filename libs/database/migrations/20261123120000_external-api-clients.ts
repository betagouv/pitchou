import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    CREATE TABLE external_api_client (
      client_id text PRIMARY KEY CHECK (length(client_id) BETWEEN 1 AND 255),
      enabled boolean NOT NULL DEFAULT false,
      rate_window_start timestamptz,
      requests_this_minute integer NOT NULL DEFAULT 0
    );

    CREATE TABLE external_api_dossier_grant (
      client_id text NOT NULL REFERENCES external_api_client ON DELETE CASCADE,
      scope text NOT NULL,
      dossier integer NOT NULL REFERENCES dossier(id) ON DELETE CASCADE,
      PRIMARY KEY (client_id, scope, dossier)
    );
    CREATE INDEX ON external_api_dossier_grant (dossier);

    CREATE TABLE external_api_groupe_grant (
      client_id text NOT NULL REFERENCES external_api_client ON DELETE CASCADE,
      scope text NOT NULL,
      groupe_instructeurs uuid NOT NULL REFERENCES groupe_instructeurs(id) ON DELETE CASCADE,
      PRIMARY KEY (client_id, scope, groupe_instructeurs)
    );
    CREATE INDEX ON external_api_groupe_grant (groupe_instructeurs);
  `);
}

export async function down(db: Knex) {
  await db.schema.dropTable("external_api_groupe_grant");
  await db.schema.dropTable("external_api_dossier_grant");
  await db.schema.dropTable("external_api_client");
}
