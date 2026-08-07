import { getODSTableRawContent } from "@odfjs/odfjs";
import * as XLSX from "xlsx";

export type TableRawContent = Awaited<ReturnType<typeof getODSTableRawContent>>;
type SheetRawContent = TableRawContent extends Map<string, infer V> ? V : never;

function isODSFile(file: ArrayBuffer): boolean {
  const start = new Uint8Array(file.slice(0, 100));
  return new TextDecoder("latin1").decode(start).includes("opendocument.spreadsheet");
}

function getXLSXTableRawContent(file: ArrayBuffer): TableRawContent {
  const workbook = XLSX.read(file, { type: "array", cellDates: true });
  const tableMap: TableRawContent = new Map();
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: SheetRawContent = [];
    if (sheet["!ref"]) {
      const range = XLSX.utils.decode_range(sheet["!ref"]);
      const cellCount = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
      if (cellCount > 250_000) throw new TypeError("Le tableur contient trop de cellules.");
      for (let r = range.s.r; r <= range.e.r; r++) {
        const row: SheetRawContent[number] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const spreadsheetCell = sheet[XLSX.utils.encode_cell({ r, c })];
          row.push({
            value: spreadsheetCell ? spreadsheetCell.v : "",
            type: spreadsheetCell && spreadsheetCell.t !== "z" ? spreadsheetCell.t : "string",
          });
        }
        rows.push(row);
      }
    }
    tableMap.set(sheetName, rows);
  }
  return tableMap;
}

export function getTableRawContent(file: ArrayBuffer): Promise<TableRawContent> {
  return isODSFile(file)
    ? getODSTableRawContent(file)
    : Promise.resolve(getXLSXTableRawContent(file));
}

export async function assertSpeciesSpreadsheet(file: ArrayBuffer): Promise<void> {
  let tables: TableRawContent;
  try {
    tables = await getTableRawContent(file);
  } catch {
    throw new TypeError("Le fichier n'est pas un tableur ODS ou XLSX valide.");
  }
  const speciesSheets = new Set(["oiseau", "faune non-oiseau", "faune_non-oiseau", "flore"]);
  const hasSpeciesTable = [...tables].some(([name, rows]) => {
    if (!speciesSheets.has(name.trim().toLowerCase())) return false;
    const headerIndex = rows.findIndex((row) =>
      row.some(({ value }) => String(value).trim() === "CD_REF"),
    );
    if (headerIndex < 0) return false;
    const cdRefIndex = rows[headerIndex].findIndex(
      ({ value }) => String(value).trim() === "CD_REF",
    );
    return rows
      .slice(headerIndex + 1)
      .some((row) => String(row[cdRefIndex]?.value ?? "").trim() !== "");
  });
  if (!hasSpeciesTable) {
    throw new TypeError("Le tableur ne contient pas de feuille d'espèces Pitchou valide.");
  }
}
