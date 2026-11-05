import type { Knex } from "knex";
import { readFile } from "node:fs/promises";
import { installHistoryTriggers } from "../migrationSupport/demandeHistory/triggers.ts";

export async function up(db: Knex) {
  await db.raw(`
    CREATE TABLE dossier_projet (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL CHECK (length(trim(name)) > 0)
    );
    -- Existing dossier rows retain their identity and become independently editable demandes.
    -- Single demandes need no membership row until another demande joins their project.
    CREATE TABLE dossier_demande (
      dossier integer PRIMARY KEY REFERENCES dossier(id) ON DELETE CASCADE,
      projet uuid NOT NULL REFERENCES dossier_projet(id) ON DELETE RESTRICT,
      label text NOT NULL CHECK (length(trim(label)) > 0)
    );
    CREATE INDEX ON dossier_demande (projet);
    CREATE TABLE demande_revision (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      dossier integer NOT NULL REFERENCES dossier(id) ON DELETE CASCADE,
      recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      transaction_id bigint NOT NULL,
      format_version integer NOT NULL DEFAULT 1 CHECK (format_version = 1),
      state jsonb NOT NULL,
      UNIQUE (dossier, transaction_id)
    );
    CREATE INDEX ON demande_revision (dossier, id DESC);
    CREATE TABLE demande_revision_file (
      revision bigint NOT NULL REFERENCES demande_revision(id) ON DELETE CASCADE,
      fichier uuid NOT NULL REFERENCES file(id) ON DELETE RESTRICT,
      relation text NOT NULL,
      expert text NOT NULL DEFAULT '',
      PRIMARY KEY (revision, fichier, relation, expert)
    );
    CREATE INDEX ON demande_revision_file (fichier);
    -- A deferred trigger drains this queue before commit, once per changed demande.
    CREATE TABLE demande_revision_pending (
      transaction_id bigint NOT NULL,
      dossier integer NOT NULL,
      PRIMARY KEY (transaction_id, dossier)
    );
  `);
  await db.raw(
    await readFile(
      new URL("../migrationSupport/demandeHistory/state.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.raw(
    await readFile(
      new URL("../migrationSupport/demandeHistory/record.sql", import.meta.url),
      "utf8",
    ),
  );
  // Installing triggers locks the source tables through commit, closing the gap
  // between the baseline read and activation of history on concurrent writes.
  await installHistoryTriggers(db);
  // Existing dossiers start with an explicit baseline; no older state is invented.
  await db.raw("SELECT record_demande_revision(id) FROM dossier ORDER BY id");
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
