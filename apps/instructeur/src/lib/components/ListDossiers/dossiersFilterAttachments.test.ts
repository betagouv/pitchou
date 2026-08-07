import { describe, expect, test } from "vitest";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { filterDossiers } from "./dossiersList.ts";
import { dossierId, makeContext, makeDossier, makeQuery } from "./dossiersTestHelpers.ts";

describe("filterDossiers attachment filters", () => {
  test("keeps dossiers with no decision file", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), decisionsAdministratives: [] }),
      makeDossier({
        id: dossierId(2),
        decisionsAdministratives: [
          { number: "AP-1", hasFile: true },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
      makeDossier({
        id: dossierId(3),
        decisionsAdministratives: [
          { number: "AP-2", hasFile: false },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
    ];
    expect(
      filterDossiers(dossiers, makeQuery({ decisionAbsente: true }), makeContext()).map(
        (d) => d.id,
      ),
    ).toEqual([1, 3]);
  });

  test("matches a decision number", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        decisionsAdministratives: [
          { number: "AP-2024-042" },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
      makeDossier({
        id: dossierId(2),
        decisionsAdministratives: [
          { number: "AP-2023-999" },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
    ];
    expect(
      filterDossiers(dossiers, makeQuery({ decisionText: "2024-042" }), makeContext()).map(
        (d) => d.id,
      ),
    ).toEqual([1]);
  });

  test("keeps dossiers with no CNPN or CSRPN avis file", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        avisExperts: [{ expert: "CNPN", hasSaisineFile: true, hasAvisFile: true }],
      }),
      makeDossier({
        id: dossierId(2),
        avisExperts: [{ expert: "CSRPN", hasSaisineFile: true, hasAvisFile: false }],
      }),
      makeDossier({ id: dossierId(3), avisExperts: [] }),
      makeDossier({
        id: dossierId(4),
        avisExperts: [{ expert: "Autre expert", hasSaisineFile: true, hasAvisFile: true }],
      }),
    ];
    expect(
      filterDossiers(dossiers, makeQuery({ avisExpertManquant: true }), makeContext()).map(
        (d) => d.id,
      ),
    ).toEqual([2, 3, 4]);
  });

  test("keeps dossiers without impacted species file", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), especesImpacteesRenseignees: false }),
      makeDossier({ id: dossierId(2), especesImpacteesRenseignees: true }),
    ];
    expect(
      filterDossiers(dossiers, makeQuery({ especesImpacteesAbsente: true }), makeContext()).map(
        (d) => d.id,
      ),
    ).toEqual([1]);
  });
});
