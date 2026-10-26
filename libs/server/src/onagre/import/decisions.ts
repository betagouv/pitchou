import { originalWorkbook } from "@pitchou/common/onagre/originalWorkbook.ts";
import { motifDerogationOptions } from "@pitchou/common/dossierFormOptions.ts";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";

// Explicitly implemented choices from the reviewed workbook. Never execute arbitrary prose.
const motifIds = [
  [25, 1003, 26, 1, 2, 3, 4, 5, 51, 52, 1004, 1012],
  [27],
  [
    28, 29, 30, 31, 32, 33, 7, 8, 9, 10, 11, 12, 13, 59, 60, 61, 62, 63, 64, 1013, 1014, 1015, 1016,
    1017, 1018,
  ],
  [58, 1006, 1010, 1011, 14, 34, 35, 36, 15, 16, 56, 57],
  [44, 17, 53, 1007],
  [46, 18, 19, 54, 55, 1008, 1009, 45, 20, 50],
  [21, 22, 49, 47, 48],
];

export function motifChoice(id: string) {
  return motifDerogationOptions[motifIds.findIndex((ids) => ids.includes(Number(id)))];
}

export function referenceChoices(table: "objet" | "motifderogation", id: string) {
  // Keys contain workbook row numbers; source identity is the first cell, never that row number.
  return originalWorkbook.sheets
    .find((sheet) => sheet.name.toLowerCase() === table)!
    .rows.filter((row) => typeof row.cells[0] === "number" && String(row.cells[0]) === id)
    .map((row) => ({ key: `reference:${table}:${row.number}`, label: String(row.cells[2]) }));
}

export function implementedDecision(
  mapping: OnagreMapping | undefined,
  target: string,
  rule: string,
) {
  return mapping?.status === "validated" && mapping.target === target && mapping.rule === rule;
}

export const fieldRules = {
  "field:demandes.lieux":
    "Ajouter le texte à la description sous « Lieux des opérations, Onagre ».",
  "field:demandes.periodes":
    "Ajouter le texte à la description sous « Périodes souhaitées, Onagre », sans le convertir en dates.",
  "field:projet.servicecoordinateurid":
    "Résoudre le nom du service et le placer dans la description sous « Service coordinateur du projet, Onagre ».",
  "field:demandes.solutionsalternatives":
    "Copier le texte dans la justification d'absence d'autre solution satisfaisante.",
  "field:demandes.motifderogationid":
    "Appliquer la correspondance du motif lié dans motifderogation.",
} as const;
