import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { createWorkbook } from "./createWorkbook.ts";

function read(file: ArrayBuffer) {
  const workbook = XLSX.read(file, { type: "array" });
  return {
    names: workbook.SheetNames,
    sheets: workbook.SheetNames.map((name) =>
      XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[name], { header: 1 }),
    ),
  };
}

describe("createWorkbook", () => {
  it("keeps one worksheet per entry, in order", () => {
    const { names } = read(
      createWorkbook([
        { name: "Dossiers", rows: [["Identifiant"]] },
        { name: "Avis experts", rows: [["Expert"]] },
      ]),
    );
    expect(names).toEqual(["Dossiers", "Avis experts"]);
  });

  it("writes cells back unchanged, numbers included", () => {
    const { sheets } = read(
      createWorkbook([
        {
          name: "Feuille",
          rows: [
            ["Identifiant", "Nom"],
            [42, "Parc éolien"],
          ],
        },
      ]),
    );
    expect(sheets[0]).toEqual([
      ["Identifiant", "Nom"],
      [42, "Parc éolien"],
    ]);
  });

  it("builds an empty sheet without rows", () => {
    const { names, sheets } = read(createWorkbook([{ name: "Vide", rows: [] }]));
    expect(names).toEqual(["Vide"]);
    expect(sheets[0]).toEqual([]);
  });
});
