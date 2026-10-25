import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

type AdminConnection = {
  connect(): Promise<void>;
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
};
const { Client } = createRequire(import.meta.url)("pg") as {
  Client: new (config: { connectionString: string }) => AdminConnection;
};

// Always CREATE a new disposable database. Never migrate or reset DATABASE_URL.
const configured = process.env.ONAGRE_VERIFY_ADMIN_URL;
if (!configured)
  throw new Error("Set ONAGRE_VERIFY_ADMIN_URL to an explicitly local PostgreSQL admin URL.");
const url = new URL(configured);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.search)
  throw new Error("Verification requires a local host without connection query overrides.");
const name = `onagre_import_verify_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString: url.href });
await admin.connect();
let db: typeof import("@pitchou/server/database.ts").directDatabaseConnection | undefined;
let created = false;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  ({ directDatabaseConnection: db } = await import("@pitchou/server/database.ts"));
  await db.migrate.latest({
    directory: fileURLToPath(new URL("../../libs/database/migrations/", import.meta.url)),
    loadExtensions: [".ts"],
  });
  const { verify } = await import("./verify-import/scenarios.ts");
  await verify(db);
  const { verifyJobs } = await import("./verify-import/jobs.ts");
  await verifyJobs(db);
  console.log(
    "PASS: disposable PostgreSQL migrations, preview safety, gates, atomic writes, replay, conflicts, stale previews, concurrency and raw provenance.",
  );
} finally {
  await db?.destroy();
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
