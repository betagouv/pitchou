import { createHash } from "node:crypto";
import { columnNames, relation, tables, textColumns, type TextRow } from "./catalog.ts";
import { TransferRefusal, type Connection } from "./connection.ts";

export async function databaseIdentity(db: Connection) {
  const { rows } = await db.query<{
    database: string;
    oid: string;
    started: string;
    address: string | null;
    port: string | null;
  }>(`select current_database() as database, oid::text,
      pg_postmaster_start_time()::text as started,
      inet_server_addr()::text as address, inet_server_port()::text as port
    from pg_database where datname = current_database()`);
  return rows[0];
}

export function assertDistinct(
  source: Awaited<ReturnType<typeof databaseIdentity>>,
  target: Awaited<ReturnType<typeof databaseIdentity>>,
) {
  const sameDatabase = source.database === target.database;
  const sameCluster = source.oid === target.oid && source.started === target.started;
  const sameAddress =
    source.address !== null && source.address === target.address && source.port === target.port;
  if (sameDatabase && (sameCluster || sameAddress))
    throw new TransferRefusal("Source and target SQL identities refer to the same database.");
}

interface Column {
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: string;
  is_generated: string;
  is_identity: string;
}

async function schema(db: Connection) {
  const { rows } = await db.query<Column>(
    `select table_name, column_name, udt_name,
    is_nullable, is_generated, is_identity from information_schema.columns
    where table_schema = 'public' and table_name = any($1::text[])
    order by table_name, column_name`,
    [tables.map((table) => table.name)],
  );
  for (const table of tables) {
    const actual = rows.filter((row) => row.table_name === table.name);
    const expected = columnNames(table).sort();
    if (JSON.stringify(actual.map((row) => row.column_name)) !== JSON.stringify(expected))
      throw new TransferRefusal(`Unexpected or missing preparation columns in ${table.name}.`);
    if (actual.some((row) => row.is_generated !== "NEVER" || row.is_identity !== "NO"))
      throw new TransferRefusal(`Unsupported generated columns in ${table.name}.`);
  }
  const relations = await db.query<{ relname: string; relkind: string; relrowsecurity: boolean }>(
    `select relname, relkind, relrowsecurity from pg_class
     where relnamespace = 'public'::regnamespace and left(relname, 7) = 'onagre_'`,
  );
  const allowed = new Set([
    ...tables.map((table) => table.name),
    "onagre_import_run",
    "onagre_import_identity",
    "onagre_import_job",
    "onagre_import_batch",
  ]);
  for (const row of relations.rows.filter((row) =>
    ["r", "p", "v", "m", "f"].includes(row.relkind),
  )) {
    if (!allowed.has(row.relname) || row.relkind !== "r" || row.relrowsecurity)
      throw new TransferRefusal(
        "Unrecognized Onagre relation, partitioning or row security. Update the transfer allowlist first.",
      );
  }
  const constraints = await db.query<{ definition: string }>(
    `select
    c.conrelid::regclass::text || ':' || pg_get_constraintdef(c.oid) as definition
    from pg_constraint c where c.conrelid = any($1::regclass[]) order by definition`,
    [tables.map((table) => `public.${table.name}`)],
  );
  return JSON.stringify({ rows, constraints: constraints.rows });
}

export async function assertSchemas(source: Connection, target: Connection) {
  const sourceSchema = await schema(source);
  if (sourceSchema !== (await schema(target)))
    throw new TransferRefusal(
      "Source and target preparation schemas differ. Apply the same migrations first.",
    );
  const { rows } = await target.query(
    `select 1 from pg_trigger t
    where not t.tgisinternal and t.tgenabled <> 'D'
      and t.tgrelid = any($1::regclass[]) limit 1`,
    [tables.map((table) => `public.${table.name}`)],
  );
  if (rows.length > 0)
    throw new TransferRefusal("Target preparation tables have unexpected user triggers.");
}

// SHA-256 over [key,title,rule,notes,status,version,updated_at] in migration 20261027120000.
const seedHashes: Record<string, string> = {
  "dossier-unit": "ec6a8a25621d01a52864d2e57dc4aeadb79cbcdf8fb38b33cf35b41eece910ca",
  "identity-updates": "1fe32fbf459e573e96136a54fddea613db86c8bb2b0b6a6a2b51c879e7772766",
  "empty-values": "a9db1430c0db4075ef78e77a852c8d00047fee00a4b6580d4158e33f95ae6bdd",
  comments: "92e4bb803ad030bbe05abcbb7288cd26f1b8742b53d5bc9abd3dc441ffc09003",
  descriptions: "4f51deb6d12020863f10be7c09932ff6a47a396870db4782531fc6ad499a6551",
  dates: "ab1d5cf026b80637e927f28ecc3bfe3ec38619492845ada4a9336b78785b13db",
  people: "c099f2e54da5226d41bf805a07091f045103ff4cc0adc0ca5c73a7072f39fab9",
  routing: "3b9240736509fc89330a29288654e6fb5c9366a2a16349c8e3c7676001e04cbf",
  source: "3c8c696b657e60e7aaa83a459e517dcbe103b36834307e230fba01db9fd566d3",
};

export function isPristineSeed(rows: TextRow[]) {
  const columns = "key title rule notes status version updated_at".split(" ");
  return (
    rows.length === Object.keys(seedHashes).length &&
    new Set(rows.map((row) => row.key)).size === rows.length &&
    rows.every(
      (row) =>
        row.key !== null &&
        createHash("sha256")
          .update(JSON.stringify(columns.map((column) => row[column])))
          .digest("hex") === seedHashes[row.key],
    )
  );
}

export async function assertEmptyTarget(target: Connection) {
  for (const table of tables.filter((table) => table.name !== "onagre_shared_rule")) {
    const { rows } = await target.query(`select 1 from ${relation(table.name)} limit 1`);
    if (rows.length > 0)
      throw new TransferRefusal(
        `Target ${table.name} is nonempty. Replays and overwrites are refused.`,
      );
  }
  const { rows } = await target.query<TextRow>(`select
    ${textColumns("key title rule notes status version updated_at".split(" "))}
    from public.onagre_shared_rule limit 10`);
  if (rows.length > 0 && !isPristineSeed(rows))
    throw new TransferRefusal("Target shared rules contain existing work. Overwrite refused.");
  return rows.length;
}
