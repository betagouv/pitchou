import { expect, it } from "vitest";
import { originalContexts, originalMappings, originalWorkbook } from "./originalWorkbook.ts";
import { mappingFromRow } from "./workbook/rows.ts";

it("retains every proposal, confidence value and comment from all five reviewed sheets", () => {
  expect(originalWorkbook.sheets).toHaveLength(5);
  expect(originalMappings).toHaveLength(193);
  expect(originalMappings.filter((row) => row.proposal)).toHaveLength(190);
  expect(Object.values(originalContexts).filter((row) => row.confidence)).toHaveLength(18);
  expect(Object.values(originalContexts).filter((row) => row.comment)).toHaveLength(5);
  expect(new Set(originalMappings.map((row) => row.key)).size).toBe(193);
  expect(originalContexts["field:projet.projetid"]).toMatchObject({
    confidence: "fort",
    comment:
      "vérifier si dans onagre les utilisateurs ont plutôt l'habitude de projetid ou de demandesid",
  });
  expect(originalContexts["reference:objet:24"].comment).toBe("Demande à caractère scientifique");
});

it("exposes every nonempty data cell, including false, zero and the shared motif legend", () => {
  for (const sheet of originalWorkbook.sheets)
    for (const row of sheet.rows) {
      const mapping = mappingFromRow(sheet.name, row);
      if (!mapping) continue;
      const context = originalContexts[mapping.key];
      const displayed = [
        context.proposal,
        context.confidence,
        context.comment,
        ...context.details.map((cell) => cell.value),
        ...context.sharedNotes,
      ].join("\n");
      for (const value of row.cells.filter((cell) => cell !== ""))
        expect(displayed).toContain(String(value));
    }
  expect(originalContexts["field:demandes.contientmesureserca"].details).toContainEqual({
    label: "Défaut",
    value: "false",
  });
  expect(originalContexts["field:demandes.nbattentecomplement"].details).toContainEqual({
    label: "Défaut",
    value: "0",
  });
  const legend = originalContexts["reference:motifderogation:2"].sharedNotes[0];
  expect(legend.split("\n")).toHaveLength(8);
  expect(legend).toContain("6 Prise ou détention limitée");
});

it("retains the sheet-level notes outside correspondence rows", () => {
  for (const name of ["Projet", "Demandes"]) {
    const sheet = originalWorkbook.sheets.find((sheet) => sheet.name === name)!;
    const notes = sheet.rows.find((row) => row.number === 2)!.cells;
    const context = Object.values(originalContexts).find((row) => row.sheet === name)!;
    expect(context.sharedNotes).toEqual([notes[6], notes[8]]);
  }
});
