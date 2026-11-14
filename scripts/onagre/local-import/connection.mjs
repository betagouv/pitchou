import { createRequire } from "node:module";
const require = createRequire(new URL("../../../libs/server/package.json", import.meta.url));
const { types } = require("pg");
const knex = require("knex");
// Keep SQL calendar dates independent of the machine's timezone.
types.setTypeParser(1082, (value) => value);
export function assertLocalTarget(env) {
  const url = new URL(env.DATABASE_URL ?? "");
  if (
    env.NODE_ENV !== "development" ||
    env.PUBLIC_PITCHOU_ENV === "staging" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "5434" ||
    url.pathname !== "/especes_pro_3731" ||
    url.username !== "dev" ||
    url.search
  ) {
    throw new Error(
      "This importer only supports the declared local development database on port 5434.",
    );
  }
  return url.href;
}
export async function connect(env) {
  return connectDatabase(
    { connectionString: assertLocalTarget(env), connectionTimeoutMillis: 5000 },
    { db: "especes_pro_3731", username: "dev" },
  );
}
export async function connectDatabase(connection, expected) {
  const db = knex({
    client: "pg",
    connection,
    pool: { min: 0, max: 1 },
  });
  const {
    rows: [identity],
  } = await db.raw("select current_database() as db, current_user as username");
  if (identity.db !== expected.db || identity.username !== expected.username) {
    await db.destroy();
    throw new Error("Unexpected database identity.");
  }
  let trx;
  return {
    get trx() {
      if (!trx || trx.isCompleted()) throw new Error("An active import transaction is required");
      return trx;
    },
    async begin() {
      if (trx && !trx.isCompleted()) throw new Error("Transaction already active");
      trx = await db.transaction();
    },
    async query(sql, values) {
      // Existing prepared SQL and application routing share the transaction's pinned pg connection.
      const connection = await this.trx.client.acquireConnection();
      return connection.query(sql, values);
    },
    async finish(apply) {
      if (!trx) return;
      const current = trx;
      trx = undefined;
      if (!current.isCompleted()) await (apply ? current.commit() : current.rollback());
      // Knex reports COMMIT errors through executionPromise, not commit()'s query promise.
      await current.executionPromise;
    },
    async end() {
      await this.finish(false);
      await db.destroy();
    },
  };
}
export async function initialize(client, environment = "development") {
  if (!["development", "staging"].includes(environment))
    throw new Error("Unsupported import environment");
  await client.query("SET LOCAL statement_timeout = '20s'");
  await client.query("SET LOCAL lock_timeout = '3s'");
  await client.query("SET LOCAL timezone = 'UTC'");
  await client.query("SELECT set_config('pitchou.environment', $1, true)", [environment]);
  await client.query("SELECT pg_advisory_xact_lock(2105102026)");
  await client.query("SELECT pg_advisory_xact_lock(27102026)");
  await client.query("CREATE SCHEMA IF NOT EXISTS onagre_local_import");
  await client.query(`CREATE TABLE IF NOT EXISTS onagre_local_import.identity (
    dossier_key text NOT NULL, source_key text NOT NULL, table_name text NOT NULL,
    target_id text NOT NULL, last_fields jsonb NOT NULL,
    PRIMARY KEY (dossier_key, source_key), UNIQUE (table_name, target_id)
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS onagre_local_import.reconciled_demande (
    source_key text PRIMARY KEY, project_key text NOT NULL, source_hash text NOT NULL,
    dossier_id integer NOT NULL REFERENCES public.dossier(id),
    project_id uuid NOT NULL REFERENCES public.dossier_projet(id),
    original_identity jsonb NOT NULL, decision jsonb NOT NULL,
    reviewed_by integer NOT NULL REFERENCES public.auth_user(id),
    recorded_at timestamptz NOT NULL DEFAULT now()
  )`);
  // Several reviewed source demandes can describe one unchanged DN record.
  await client.query(`ALTER TABLE onagre_local_import.reconciled_demande
    DROP CONSTRAINT IF EXISTS reconciled_demande_dossier_id_key`);
  await client.query(`CREATE TABLE IF NOT EXISTS onagre_local_import.excluded_candidate (
    project_key text NOT NULL, dossier_id integer NOT NULL REFERENCES public.dossier(id),
    source_hash text NOT NULL, target_hash text NOT NULL, evidence_hash text NOT NULL,
    decision jsonb NOT NULL, reviewed_by integer NOT NULL REFERENCES public.auth_user(id),
    recorded_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (project_key, dossier_id)
  )`);
}
