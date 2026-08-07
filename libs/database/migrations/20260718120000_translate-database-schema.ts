import type { Knex } from "knex";

import { columnComments } from "./translate-database-schema/column-comments.ts";
import { columnRenames, tableRenames } from "./translate-database-schema/renames.ts";

function quotePostgresIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quotePostgresLiteral(value: string) {
  if (value.includes("\0")) throw new Error("PostgreSQL literals cannot contain null bytes");
  return `E'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

async function applyColumnComments(knex: Knex, direction: "up" | "down") {
  const commentIndex = direction === "up" ? 1 : 0;

  for (const [tableName, columns] of Object.entries(columnComments)) {
    for (const [columnName, comments] of Object.entries(columns)) {
      const qualifiedColumn = `${quotePostgresIdentifier(tableName)}.${quotePostgresIdentifier(columnName)}`;
      await knex.raw(
        `COMMENT ON COLUMN ${qualifiedColumn} IS ${quotePostgresLiteral(comments[commentIndex])}`,
      );
    }
  }
}

async function renameTables(knex: Knex, renames: readonly (readonly [string, string])[]) {
  for (const [from, to] of renames) {
    await knex.schema.renameTable(from, to);
  }
}

async function renameColumns(knex: Knex, renames: typeof columnRenames, direction: "up" | "down") {
  const entries = Object.entries(renames);
  if (direction === "down") entries.reverse();

  for (const [tableName, columns] of entries) {
    const orderedColumns = direction === "up" ? columns : [...columns].reverse();
    for (const [oldName, newName] of orderedColumns) {
      const from = direction === "up" ? oldName : newName;
      const to = direction === "up" ? newName : oldName;
      await knex.schema.alterTable(tableName, (table) => table.renameColumn(from, to));
    }
  }
}

export const up = async (knex: Knex) => {
  await renameTables(knex, tableRenames);
  await renameColumns(knex, columnRenames, "up");
  await applyColumnComments(knex, "up");
  await knex.raw('ALTER TYPE "TypeDossier" RENAME TO type_dossier');
};

export const down = async (knex: Knex) => {
  await knex.raw('ALTER TYPE type_dossier RENAME TO "TypeDossier"');
  await applyColumnComments(knex, "down");
  await renameColumns(knex, columnRenames, "down");
  await renameTables(
    knex,
    [...tableRenames].reverse().map(([oldName, newName]) => [newName, oldName]),
  );
};
