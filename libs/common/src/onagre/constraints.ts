import type { OnagreTable, OnagreFieldRelations } from "@pitchou/types/onagre.ts";

const identifier = '"?[a-z_][a-z0-9_]*"?';
const unquote = (value: string) => value.replaceAll('"', "");
function columns(value: string): string[] {
  return value.split(",").map((part) => {
    const name = part.trim();
    if (!new RegExp(`^${identifier}$`, "u").test(name))
      throw new Error("Unsupported constraint column");
    return unquote(name);
  });
}

export function withConstraints(sql: string, tables: OnagreTable[]): OnagreTable[] {
  const result = tables.map((table) => ({
    ...table,
    constraints: {
      primaryKey: [] as string[],
      foreignKeys: [] as NonNullable<OnagreTable["constraints"]>["foreignKeys"],
    },
  }));
  const pattern = new RegExp(
    `ALTER TABLE\\s+(?:ONLY\\s+)?"?onagre"?\\.(${identifier})\\s+ADD CONSTRAINT\\s+(${identifier})\\s+(PRIMARY KEY|FOREIGN KEY)\\s*\\(([^)]+)\\)(?:\\s+REFERENCES\\s+"?onagre"?\\.(${identifier})\\s*\\(([^)]+)\\))?[^;]*;`,
    "gu",
  );
  let parsed = 0;
  for (const match of sql.matchAll(pattern)) {
    parsed++;
    const table = result.find((table) => table.name === unquote(match[1]));
    if (!table) throw new Error(`Constraint table absent: ${match[1]}`);
    const sourceColumns = columns(match[4]);
    if (!sourceColumns.every((column) => table.columns.includes(column)))
      throw new Error("Constraint column absent");
    if (match[3] === "PRIMARY KEY") table.constraints.primaryKey = sourceColumns;
    else {
      if (!match[5] || !match[6]) throw new Error("Unsupported foreign key target");
      const targetTable = unquote(match[5]);
      const targetColumns = columns(match[6]);
      const target = result.find((table) => table.name === targetTable);
      if (
        !target ||
        sourceColumns.length !== targetColumns.length ||
        !targetColumns.every((column) => target.columns.includes(column))
      )
        throw new Error("Foreign key target absent or inconsistent");
      table.constraints.foreignKeys.push({
        name: unquote(match[2]),
        columns: sourceColumns,
        targetTable,
        targetColumns,
      });
    }
  }
  const declared = [...sql.matchAll(/\bADD CONSTRAINT\s+\S+\s+(?:PRIMARY KEY|FOREIGN KEY)\s*\(/gu)]
    .length;
  if (parsed !== declared) throw new Error("Unsupported key constraint syntax in dump");
  return result;
}

export function fieldRelations(
  tables: OnagreTable[],
  tableName: string,
  column: string,
): OnagreFieldRelations | undefined {
  const table = tables.find((table) => table.name === tableName);
  // An older package contains no constraints. Do not confuse unknown with no relation.
  if (!table?.constraints || !tables.every((table) => table.constraints)) return undefined;
  return {
    primaryKey: table.constraints.primaryKey.includes(column) ? table.constraints.primaryKey : [],
    outgoing: table.constraints.foreignKeys.filter((key) => key.columns.includes(column)),
    incoming: tables.flatMap((source) =>
      source
        .constraints!.foreignKeys.filter(
          (key) => key.targetTable === tableName && key.targetColumns.includes(column),
        )
        .map((key) => ({ ...key, sourceTable: source.name })),
    ),
  };
}
