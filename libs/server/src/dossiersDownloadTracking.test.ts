import { expect, test } from "vitest";
import { evenementMetriqueGuard } from "./evenements_metriques.ts";

const details = { page: "tous-les-dossiers", format: "csv", scope: "service", dossierCount: 12 };

test.each([
  details,
  { ...details, format: "ods", scope: "france" },
  { ...details, page: "mes-dossiers", scope: "followed" },
])("accepts download metadata %j", (value) => {
  expect(evenementMetriqueGuard({ type: "downloadDossiersExport", details: value })).toBe(true);
});

test.each([
  undefined,
  null,
  {},
  { ...details, format: "xlsx" },
  { ...details, page: "tableau-de-suivi" },
  { ...details, scope: "unknown" },
  { ...details, scope: "followed" },
  { ...details, page: "mes-dossiers" },
  { ...details, dossierCount: -1 },
  { ...details, dossierCount: 1.5 },
  { ...details, dossierCount: "12" },
])("rejects invalid download metadata %j", (value) => {
  expect(evenementMetriqueGuard({ type: "downloadDossiersExport", details: value })).toBe(false);
});
