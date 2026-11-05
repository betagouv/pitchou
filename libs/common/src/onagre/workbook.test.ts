import { expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readOnagreWorkbook } from "./workbook.ts";
it("preserves competing workbook proposals, confidence and notes, excluding blank formatting rows", () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["STRUCTURE"],
      ["Colonne", "Type"],
      [
        "nomprojet",
        "character varying(150)",
        "NO",
        "",
        "",
        "Nom",
        "titre du projet",
        "fort",
        "à vérifier",
      ],
      [],
      [],
    ]),
    "Projet",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["objetid", "codeobjet", "libobjet"],
      [4, "13d", "Énergie", 1, "", "Solaire"],
      [4, "13d", "Énergie", 1, "", "Éolien"],
    ]),
    "Objet",
  );
  const rows = readOnagreWorkbook(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({
    key: "field:projet.nomprojet",
    proposal: "titre du projet",
    confidence: "fort",
    notes: "à vérifier",
  });
  expect(rows[1].key).not.toBe(rows[2].key);
  expect(rows.slice(1).map((row) => row.proposal)).toEqual(["Solaire", "Éolien"]);
});
