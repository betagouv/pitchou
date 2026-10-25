import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { withConstraints } from "@pitchou/common/onagre/constraints.ts";
import { enrichSnapshotConstraints } from "@pitchou/server/onagre/constraints.ts";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";

const [path, flag] = process.argv.slice(2);
if (!path || (flag && flag !== "--apply"))
  throw new Error("Usage: refresh-schema.ts DUMP [--apply]");
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error(
    "Use a local workspace. Remote snapshots can be enriched by uploading a freshly prepared package.",
  );
try {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const fingerprint = hash.digest("hex");
  const snapshot = await db("onagre_snapshot").where({ fingerprint }).first("id", "tables");
  if (!snapshot) throw new Error("No snapshot matches the exact dump fingerprint.");
  const { stdout } = await promisify(execFile)(
    "pg_restore",
    ["--schema-only", "--no-owner", "--no-privileges", "--file=-", path],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  const tables = withConstraints(stdout, snapshot.tables);
  if (flag === "--apply")
    await db.transaction(async (trx) => {
      await trx.raw("select pg_advisory_xact_lock(24102026)");
      await enrichSnapshotConstraints(trx, snapshot.id, tables);
    });
  console.log(
    JSON.stringify({
      snapshotId: snapshot.id,
      applied: flag === "--apply",
      tables: tables.length,
      primaryKeys: tables.filter((table) => table.constraints?.primaryKey.length).length,
      foreignKeys: tables.reduce(
        (count, table) => count + (table.constraints?.foreignKeys.length ?? 0),
        0,
      ),
    }),
  );
} finally {
  await db.destroy();
}
