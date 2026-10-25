import { isDeepStrictEqual } from "node:util";
import type { Knex } from "knex";
import type { OnagreTable } from "@pitchou/types/onagre.ts";

export function validConstraints(tables: OnagreTable[]): boolean {
  const columnList = (value: unknown, table: OnagreTable) =>
    Array.isArray(value) &&
    value.length <= table.columns.length &&
    new Set(value).size === value.length &&
    value.every((column) => typeof column === "string" && table.columns.includes(column));
  return tables.every((table) => {
    const keys = table.constraints;
    if (keys === undefined) return true;
    if (
      !keys ||
      typeof keys !== "object" ||
      !columnList(keys.primaryKey, table) ||
      !Array.isArray(keys.foreignKeys) ||
      keys.foreignKeys.length > 1000
    )
      return false;
    return keys.foreignKeys.every((key) => {
      if (!key || typeof key.name !== "string" || key.name.length > 255) return false;
      const target = tables.find((table) => table.name === key.targetTable);
      return (
        target &&
        columnList(key.columns, table) &&
        key.columns.length > 0 &&
        columnList(key.targetColumns, target) &&
        key.columns.length === key.targetColumns.length
      );
    });
  });
}

export async function enrichSnapshotConstraints(
  trx: Knex.Transaction,
  id: number,
  incoming: OnagreTable[],
) {
  if (!incoming.some((table) => table.constraints)) return;
  if (!validConstraints(incoming)) throw new Error("Contraintes du dump invalides.");
  const snapshot = await trx("onagre_snapshot").where({ id }).forUpdate().first("tables");
  const stored: OnagreTable[] = snapshot.tables;
  if (stored.length !== incoming.length)
    throw new Error("La structure diffère du dump déjà chargé.");
  let changed = false;
  const tables = stored.map((table) => {
    const next = incoming.find((candidate) => candidate.name === table.name);
    if (!next || next.count !== table.count || !isDeepStrictEqual(next.columns, table.columns))
      throw new Error("La structure diffère du dump déjà chargé.");
    if (!next.constraints) return table;
    if (table.constraints && !isDeepStrictEqual(table.constraints, next.constraints))
      throw new Error("Les contraintes diffèrent du dump déjà chargé.");
    if (table.constraints) return table;
    changed = true;
    return { ...table, constraints: next.constraints };
  });
  if (changed)
    await trx("onagre_snapshot")
      .where({ id })
      .update({ tables: JSON.stringify(tables) });
}
