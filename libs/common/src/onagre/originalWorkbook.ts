import source from "./workbook/source.json" with { type: "json" };
import { mappingFromRow, mappingsFromSheets } from "./workbook/rows.ts";
import type { WorkbookContext, WorkbookSheet } from "@pitchou/types/onagreWorkbook.ts";

export const originalWorkbook = source;
export const originalMappings = mappingsFromSheets(source.sheets);

function sheetNotes(sheet: WorkbookSheet): string[] {
  const cells = sheet.rows.find((row) => row.number === 2)?.cells ?? [];
  if (["Projet", "Demandes"].includes(sheet.name))
    return [cells[6], cells[8]].filter(Boolean).map(String);
  if (sheet.name === "motifderogation")
    return [
      sheet.rows
        .map((row) => row.cells[10])
        .filter(Boolean)
        .join("\n"),
    ];
  return [];
}

function rowDetails(sheet: WorkbookSheet, row: WorkbookSheet["rows"][number], isField: boolean) {
  const header = isField
    ? ["Colonne", "Type", "Nullable", "Défaut", "Clé", "Commentaire du schéma Onagre"]
    : sheet.name === "decisions"
      ? ["Identifiant", "Code", "Libellé", "Description", "Valeur source E"]
      : sheet.rows[0].cells.slice(0, sheet.name === "motifderogation" ? 7 : 5).map(String);
  return header.flatMap((label, index) => {
    const value = row.cells[index];
    return value === "" || value === undefined ? [] : [{ label, value: String(value) }];
  });
}

export const originalContexts: Record<string, WorkbookContext> = Object.fromEntries(
  source.sheets.flatMap((sheet) =>
    sheet.rows.flatMap((row) => {
      const mapping = mappingFromRow(sheet.name, row);
      if (!mapping) return [];
      return [
        [
          mapping.key,
          {
            sheet: sheet.name,
            row: row.number,
            proposal: mapping.proposal,
            confidence: mapping.confidence,
            comment: mapping.notes,
            details: rowDetails(sheet, row, mapping.key.startsWith("field:")),
            sharedNotes: sheetNotes(sheet),
          },
        ],
      ];
    }),
  ),
);
