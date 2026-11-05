import { expect, test } from "vitest";
import type { ExportDossier } from "@pitchou/types/dossierExport.ts";
import { dossierExportRow } from "./dossiersExport.ts";
const dossier = (overrides: Partial<ExportDossier>) =>
  ({
    prescriptions: [],
    followers: [],
    especes: [],
    avis: [],
    decisions: [],
    ...overrides,
  }) as ExportDossier;

test("exports declared and verified organisation identity with uncertainty, without inventing SIRET", () => {
  const organisation = {
    type: "organisation" as const,
    name: "Association des marais",
    siren: null,
    address: null,
    verification_status: "source_declared" as const,
    verification_evidence: null,
    source: "onagre",
    source_reference: "ORG-42",
  };
  expect(dossierExportRow(dossier({ organisation }))[7]).toBe(
    "Association des marais ; Organisation déclarée dans Onagre — à vérifier",
  );
  expect(
    dossierExportRow(
      dossier({
        organisation: {
          ...organisation,
          verification_status: "verified",
          siren: "123456789",
          verification_evidence: "Registre",
        },
      }),
    )[7],
  ).toBe(
    "Association des marais ; Organisation vérifiée — établissement à confirmer ; SIREN 123456789",
  );
});
