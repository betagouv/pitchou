import { createHash } from "node:crypto";
import { relation, tables } from "./catalog.ts";
import { connectTo, TransferRefusal, type Connection, type readOptions } from "./connection.ts";
import { assertDistinct, assertEmptyTarget, assertSchemas, databaseIdentity } from "./guards.ts";
import { transferActors } from "./actors.ts";
import { copyTable, restartSequence } from "./rows.ts";

type Options = ReturnType<typeof readOptions>;
type Progress = (value: { table: string; count: number; sha256: string }) => void | Promise<void>;

export async function runTransfer(options: Options, progress: Progress = () => {}) {
  const source = connectTo(options.sourceUrl);
  const target = connectTo(options.targetUrl);
  try {
    await source.connect();
    await target.connect();
    await begin(source, false);
    await begin(target, options.apply);
    if (options.apply) {
      // Blocks concurrent preparation edits/inserts and actor edits until commit, including seeds.
      await target.query(`lock table ${tables.map((table) => relation(table.name)).join(", ")}
        in access exclusive mode`);
      await target.query("lock table public.auth_user in share row exclusive mode");
    }
    const sourceIdentity = await databaseIdentity(source);
    const targetIdentity = await databaseIdentity(target);
    assertDistinct(sourceIdentity, targetIdentity);
    if (targetIdentity.database !== options.expectedDatabase)
      throw new TransferRefusal("Actual target database does not match ONAGRE_EXPECTED_DATABASE.");
    await assertSchemas(source, target);
    const replacedSeedRules = await assertEmptyTarget(target);
    const counts = await sourceCounts(source);
    const actors = await transferActors(source, target, options.apply);
    if (options.apply) {
      if (replacedSeedRules > 0) await target.query("delete from public.onagre_shared_rule");
      await copyPreparation(source, target, counts, progress);
      if (actors.historyOnly > 0) await restartSequence(target, "auth_user");
    }
    // End the read-only source before the sole target commit. A failed copy never commits partial data.
    await source.query("rollback");
    if (options.apply) await commitTarget(target);
    else await target.query("rollback");
    const fingerprint = (value: unknown) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex");
    return {
      mode: options.apply ? "applied" : "preview",
      sourceIdentity: fingerprint(sourceIdentity),
      targetIdentity: fingerprint(targetIdentity),
      rows: counts,
      actors,
      replacedSeedRules,
    };
  } finally {
    // Rollback also handles errors during validation or streaming. Never log raw pg errors/data.
    await Promise.allSettled([source.query("rollback"), target.query("rollback")]);
    await Promise.allSettled([source.end(), target.end()]);
  }
}

async function begin(db: Connection, writable: boolean) {
  // Target locks serialize writers. READ COMMITTED sees writes that finish before the locks arrive.
  await db.query(
    writable
      ? "begin isolation level read committed read write"
      : "begin isolation level repeatable read read only",
  );
  await db.query("set local search_path = pg_catalog, public");
  await db.query("set local timezone = 'UTC'");
  await db.query("set local datestyle = 'ISO, YMD'");
  await db.query("set local bytea_output = 'hex'");
  await db.query("set local lock_timeout = '10s'");
  await db.query("set local statement_timeout = '30min'");
}

async function commitTarget(target: Connection) {
  try {
    await target.query("commit");
  } catch (error) {
    throw new TransferRefusal(
      "Target COMMIT was not acknowledged. Its outcome is unknown. Inspect the target before retrying.",
      { cause: error },
    );
  }
}

async function sourceCounts(source: Connection) {
  const incomplete = await source.query(
    "select 1 from public.onagre_snapshot where not records_complete limit 1",
  );
  if (incomplete.rows.length > 0)
    throw new TransferRefusal(
      "Source contains incomplete snapshots. Finish preparation before transferring.",
    );
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const { rows } = await source.query<{ count: string }>(
      `select count(*)::text as count from ${relation(table.name)}`,
    );
    const count = Number(rows[0].count);
    if (!Number.isSafeInteger(count))
      throw new TransferRefusal("Source row count exceeds the supported integer range.");
    counts[table.name] = count;
  }
  if (counts.onagre_snapshot === 0)
    throw new TransferRefusal("Source has no prepared snapshot. Nothing to transfer.");
  return counts;
}

async function copyPreparation(
  source: Connection,
  target: Connection,
  counts: Record<string, number>,
  progress: Progress,
) {
  for (const table of tables) {
    const result = await copyTable(source, target, table);
    const actual = await target.query<{ count: string }>(
      `select count(*)::text as count from ${relation(table.name)}`,
    );
    if (result.count !== counts[table.name] || Number(actual.rows[0].count) !== result.count)
      throw new TransferRefusal(`Source/target row count verification failed for ${table.name}.`);
    if (table.sequence) await restartSequence(target, table.name);
    await progress({ table: table.name, ...result });
  }
}
