import { createHash } from "node:crypto";
import { columnNames, quote, relation, textColumns, type Table, type TextRow } from "./catalog.ts";
import { TransferRefusal, type Connection } from "./connection.ts";

export async function* batches(db: Connection, select: string, batchSize = 1000) {
  await db.query(`declare onagre_transfer_cursor no scroll cursor for ${select}`);
  try {
    while (true) {
      const { rows } = await db.query<TextRow>(
        `fetch forward ${batchSize} from onagre_transfer_cursor`,
      );
      if (rows.length === 0) return;
      yield rows;
    }
  } finally {
    await db.query("close onagre_transfer_cursor");
  }
}

export async function insertRows(target: Connection, table: Table, rows: TextRow[]) {
  const columns = columnNames(table);
  const parameters = rows.map(
    (_, index) =>
      `(${columns.map((__, offset) => `$${index * columns.length + offset + 1}`).join(",")})`,
  );
  await target.query(
    `insert into ${relation(table.name)} (${columns.map(quote).join(",")}) values ${parameters.join(",")}`,
    rows.flatMap((row) => columns.map((column) => row[column])),
  );
}

export async function copyTable(source: Connection, target: Connection, table: Table) {
  const hash = createHash("sha256");
  let count = 0;
  const select = `select ${textColumns(columnNames(table))} from ${relation(table.name)}`;
  for await (const rows of batches(source, select, table.batchSize)) {
    if (table.actor) await remapActors(target, rows);
    // A length-delimited JSON row preserves nulls, whitespace and byte boundaries in the digest.
    for (const row of rows)
      hash.update(`${JSON.stringify(columnNames(table).map((key) => row[key]))}\n`);
    await insertRows(target, table, rows);
    count += rows.length;
  }
  return { count, sha256: hash.digest("hex") };
}

async function remapActors(target: Connection, rows: TextRow[]) {
  const result = await target.query<{ source_id: string; target_id: string }>(
    "select source_id::text, target_id::text from pg_temp.onagre_transfer_actor where source_id = any($1::int[])",
    [rows.map((row) => row.actor_id)],
  );
  const ids = new Map(result.rows.map((row) => [row.source_id, row.target_id]));
  for (const row of rows) {
    const id = ids.get(row.actor_id!);
    if (!id) throw new TransferRefusal("Missing verified target identity for a revision actor.");
    row.actor_id = id;
  }
}

export async function restartSequence(target: Connection, table: string) {
  const { rows } = await target.query<{ sequence: string | null; maximum: string | null }>(
    `select pg_get_serial_sequence($1, 'id') as sequence, max(id)::text as maximum from ${relation(table)}`,
    [`public.${table}`],
  );
  const sequence = rows[0].sequence;
  if (!sequence) throw new TransferRefusal(`Missing ID sequence for ${table}.`);
  const parsed = await target.query<{ schema: string; name: string; next: string }>(
    `select n.nspname as schema, c.relname as name,
      greatest(coalesce(s.last_value, 0) + 1, $2::bigint + 1, s.start_value)::text as next
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_sequences s on s.schemaname = n.nspname and s.sequencename = c.relname
    where c.oid = $1::regclass`,
    [sequence, rows[0].maximum ?? "0"],
  );
  const entry = parsed.rows[0];
  if (!entry || !/^\d+$/u.test(entry.next))
    throw new TransferRefusal(`Unable to inspect ID sequence for ${table}.`);
  // ALTER SEQUENCE RESTART rolls back with the data. setval would survive a failed transaction.
  await target.query(
    `alter sequence ${quote(entry.schema)}.${quote(entry.name)} restart with ${entry.next}`,
  );
}
