import * as XLSX from "xlsx";
import type { MappingSeed } from "@pitchou/types/onagre.ts";

export function readOnagreWorkbook(bytes: Uint8Array): MappingSeed[] {
  const workbook = XLSX.read(bytes);
  const result: MappingSeed[] = [];
  for (const section of workbook.SheetNames) {
    const sheet = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(
      workbook.Sheets[section],
      {
        header: 1,
        defval: "",
      },
    );
    sheet.forEach((row, index) => {
      const cell = (n: number) => String(row[n] ?? "");
      const isField =
        /^[a-z][a-z0-9_]*$/u.test(cell(0)) && /^(integer|boolean|date|character)/u.test(cell(1));
      const isReference = typeof row[0] === "number";
      if (!isField && !isReference) return;
      const table = section.toLowerCase();
      result.push({
        // Repeated reference IDs represent competing proposals. Preserve every workbook row.
        key: isField ? `field:${table}.${cell(0)}` : `reference:${table}:${index + 1}`,
        section: isReference && table === "decisions" ? "naturedecision" : table,
        label: isField ? cell(0) : `${cell(0)} · ${cell(2)}`,
        context: isField
          ? [cell(1), cell(4), cell(5)].filter(Boolean).join(" · ")
          : row.slice(0, table === "motifderogation" ? 7 : 5).join(" · "),
        proposal: cell(isField ? 6 : table === "motifderogation" ? 7 : 5),
        confidence: isField && table === "projet" ? cell(7) : "",
        notes: isField ? cell(8) : table === "objet" ? cell(6) : "",
      });
    });
  }
  if (result.length === 0) throw new Error("Aucune correspondance reconnue dans le classeur.");
  return result;
}
