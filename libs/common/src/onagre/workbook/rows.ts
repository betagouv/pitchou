import type { MappingSeed } from "@pitchou/types/onagre.ts";
import type { WorkbookSheet } from "@pitchou/types/onagreWorkbook.ts";

export function mappingFromRow(
  sheet: string,
  row: WorkbookSheet["rows"][number],
): MappingSeed | null {
  const cell = (n: number) => String(row.cells[n] ?? "");
  const isField =
    /^[a-z][a-z0-9_]*$/u.test(cell(0)) && /^(integer|boolean|date|character)/u.test(cell(1));
  const isReference = typeof row.cells[0] === "number";
  if (!isField && !isReference) return null;
  const table = sheet.toLowerCase();
  return {
    // Row numbers preserve competing proposals for the same reference ID.
    key: isField ? `field:${table}.${cell(0)}` : `reference:${table}:${row.number}`,
    section: isReference && table === "decisions" ? "naturedecision" : table,
    label: isField ? cell(0) : `${cell(0)} · ${cell(2)}`,
    context: isField
      ? [cell(1), cell(4), cell(5)].filter(Boolean).join(" · ")
      : row.cells.slice(0, table === "motifderogation" ? 7 : 5).join(" · "),
    proposal: cell(isField ? 6 : table === "motifderogation" ? 7 : 5),
    confidence: isField && table === "projet" ? cell(7) : "",
    notes: isField ? cell(8) : table === "objet" ? cell(6) : "",
  };
}

export function mappingsFromSheets(sheets: WorkbookSheet[]): MappingSeed[] {
  return sheets.flatMap((sheet) =>
    sheet.rows.flatMap((row) => {
      const mapping = mappingFromRow(sheet.name, row);
      return mapping ? [mapping] : [];
    }),
  );
}
