import * as XLSX from "xlsx";

export type SpreadsheetTable = (string | number)[][];

export function tableToCsv(table: SpreadsheetTable): string {
  return (
    "\uFEFF" +
    table
      .map((row) =>
        row
          .map((value) => {
            let text = String(value);
            // CSV quoting does not prevent spreadsheet applications from evaluating formulas.
            if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n") +
    "\r\n"
  );
}

export function tableToOds(table: SpreadsheetTable): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(table), "Dossiers");
  return XLSX.write(workbook, { bookType: "ods", type: "array" });
}
