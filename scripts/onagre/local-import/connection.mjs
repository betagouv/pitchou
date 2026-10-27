import { createRequire } from "node:module";
const { Client, types } = createRequire(
  new URL("../../../libs/server/package.json", import.meta.url),
)("pg");
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
  const client = new Client({
    connectionString: assertLocalTarget(env),
    connectionTimeoutMillis: 5000,
  });
  client.on("error", () => {});
  await client.connect();
  const {
    rows: [identity],
  } = await client.query("select current_database() as db, current_user as username");
  if (identity.db !== "especes_pro_3731" || identity.username !== "dev") {
    await client.end();
    throw new Error("Unexpected database identity.");
  }
  return client;
}
export async function initialize(client) {
  await client.query("SET LOCAL statement_timeout = '20s'");
  await client.query("SET LOCAL lock_timeout = '3s'");
  await client.query("SET LOCAL timezone = 'UTC'");
  await client.query(
    "SELECT set_config('pitchou.environment', 'development', true), set_config('pitchou.notification_baseline', 'true', true)",
  );
  await client.query("SELECT pg_advisory_xact_lock(2105102026)");
  await client.query("SELECT pg_advisory_xact_lock(27102026)");
  await client.query("CREATE SCHEMA IF NOT EXISTS onagre_local_import");
  await client.query(`CREATE TABLE IF NOT EXISTS onagre_local_import.identity (
    dossier_key text NOT NULL, source_key text NOT NULL, table_name text NOT NULL,
    target_id text NOT NULL, last_fields jsonb NOT NULL,
    PRIMARY KEY (dossier_key, source_key), UNIQUE (table_name, target_id)
  )`);
}
