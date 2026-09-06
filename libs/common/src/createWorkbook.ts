import * as XLSX from "xlsx";

export type WorkbookCell = string | number;
export type WorkbookSheet = { name: string; rows: WorkbookCell[][] };

/**
 * Builds an .xlsx workbook, one worksheet per entry, in the order given. Each sheet is a plain
 * array of rows: the first one is usually the header.
 */
export function createWorkbook(sheets: WorkbookSheet[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}
