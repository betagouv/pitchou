import type { Knex } from "knex";
import type { OnagreBundle, SourceRow } from "@pitchou/types/onagre.ts";
import { parseBundle } from "./validation.ts";
import { stageSnapshot } from "./snapshots.ts";
import { packageLines } from "./packageLines.ts";

type Block = { table: string; rows: SourceRow[] };
function validateBlock(value: unknown, bundle: OnagreBundle, counts: Map<string, number>): Block {
  const block = value as Block;
  const table = bundle.tables.find((item) => item.name === block?.table);
  const offset = counts.get(block?.table) ?? 0;
  if (
    !table ||
    !Array.isArray(block.rows) ||
    block.rows.length === 0 ||
    block.rows.length > 500 ||
    offset + block.rows.length > table.count
  )
    throw new Error("Bloc de table invalide.");
  const core =
    block.table === "demandes" ? bundle.demandes : block.table === "projet" ? bundle.projets : null;
  for (const [index, row] of block.rows.entries()) {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row) ||
      Object.keys(row).length !== table.columns.length ||
      !table.columns.every((column) => row[column] === null || typeof row[column] === "string")
    )
      throw new Error(`Ligne invalide dans ${table.name}.`);
    if (core && !table.columns.every((column) => row[column] === core[offset + index]?.[column]))
      throw new Error(`Les lignes de ${table.name} ne correspondent pas au manifeste.`);
  }
  return block;
}

export async function stagePackage(
  trx: Knex.Transaction,
  stream: AsyncIterable<Uint8Array>,
  compressed: boolean,
) {
  const lines = packageLines(stream, compressed);
  try {
    const first = await lines.next();
    if (first.done) throw new Error("Paquet vide.");
    const header = JSON.parse(first.value);
    const full = header.format === "pitchou-onagre-stream-v1";
    const bundle = parseBundle(full ? header.bundle : header);
    const result = await stageSnapshot(trx, bundle);
    if (!full) return result;
    const snapshot = await trx("onagre_snapshot")
      .where({ id: result.id })
      .first("records_complete", "tables");
    if (snapshot.records_complete) return result;
    if (JSON.stringify(snapshot.tables) !== JSON.stringify(bundle.tables)) {
      // JSONB reorders object keys. Compare the table definitions by name and column order.
      if (
        snapshot.tables.length !== bundle.tables.length ||
        bundle.tables.some((table) => {
          const existing = snapshot.tables.find(
            (item: { name: string }) => item.name === table.name,
          );
          return (
            !existing ||
            existing.count !== table.count ||
            JSON.stringify(existing.columns) !== JSON.stringify(table.columns)
          );
        })
      )
        throw new Error("La structure diffère du dump déjà chargé.");
    }
    const counts = new Map<string, number>();
    for await (const line of lines) {
      const block = validateBlock(JSON.parse(line), bundle, counts);
      const offset = counts.get(block.table) ?? 0;
      await trx("onagre_source_row").insert(
        block.rows.map((content, i) => ({
          snapshot_id: result.id,
          table_name: block.table,
          row_number: offset + i + 1,
          content,
        })),
      );
      counts.set(block.table, offset + block.rows.length);
    }
    if (bundle.tables.some((table) => (counts.get(table.name) ?? 0) !== table.count))
      throw new Error("Paquet incomplet. Certaines lignes du dump sont absentes.");
    await trx("onagre_snapshot").where({ id: result.id }).update({ records_complete: true });
    return result;
  } finally {
    await lines.return(undefined);
  }
}
