import * as XLSX from "xlsx";
import type { MappingSeed } from "@pitchou/types/onagre.ts";
import { mappingsFromSheets } from "./workbook/rows.ts";

export function readOnagreWorkbook(bytes: Uint8Array): MappingSeed[] {
  const workbook = XLSX.read(bytes);
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils
      .sheet_to_json<(string | number | boolean)[]>(workbook.Sheets[name], {
        header: 1,
        defval: "",
      })
      .map((cells, index) => ({ number: index + 1, cells })),
  }));
  const result = mappingsFromSheets(sheets);
  if (result.length === 0) throw new Error("Aucune correspondance reconnue dans le classeur.");
  return result;
}
