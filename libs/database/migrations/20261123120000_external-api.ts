import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    CREATE TABLE external_api_client (
      client_id text PRIMARY KEY CHECK (length(client_id) BETWEEN 1 AND 255),
      enabled boolean NOT NULL DEFAULT false,
      rate_window_start timestamptz,
      requests_this_minute integer NOT NULL DEFAULT 0,
      name text,
      allow_oauth boolean NOT NULL DEFAULT false
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

    CREATE TABLE external_api_key (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      secret_hash text NOT NULL UNIQUE CHECK (length(secret_hash) = 64),
      label text NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
      user_id integer REFERENCES auth_user(id) ON DELETE CASCADE,
      client_id text REFERENCES external_api_client(client_id) ON DELETE CASCADE,
      scopes text[] NOT NULL CHECK (cardinality(scopes) > 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      last_used_at timestamptz,
      rate_window_start timestamptz,
      requests_this_minute integer NOT NULL DEFAULT 0,
      CHECK (num_nonnulls(user_id, client_id) = 1),
      CHECK (expires_at > created_at)
    );
    CREATE INDEX ON external_api_key (user_id);
    CREATE INDEX ON external_api_key (client_id);
  `);
}

export async function down(db: Knex) {
  await db.schema.dropTable("external_api_key");
  await db.schema.dropTable("external_api_groupe_grant");
  await db.schema.dropTable("external_api_dossier_grant");
  await db.schema.dropTable("external_api_client");
}
