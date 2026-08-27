import { expect, test, vi } from "vitest";

vi.mock(import("$lib/dossier/dossier.ts"), () => ({
  especesImpacteesFromFichierOdsArrayBuffer: vi.fn(),
}));

import { especesImpacteesFromFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";
import { loadEspecesImpactees } from "./loadEspecesImpactees.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

function dossierWithFichier(name: string): DossierFull {
  return {
    especesImpactees: { name, media_type: null, url: "https://example.org/fichier" },
  } as unknown as DossierFull;
}

test("reports an anomaly instead of rejecting when the file is neither .ods nor .xlsx", async () => {
  const result = await loadEspecesImpactees(dossierWithFichier("especes-impactees.pdf"));

  expect(result?.anomalies).toEqual([
    {
      message:
        "le fichier « especes-impactees.pdf » n’est ni un .ods ni un .xlsx : il n’a pas pu être lu",
    },
  ]);
  expect(result?.impactEspece).toEqual({ oiseau: [], "faune non-oiseau": [], flore: [] });
  expect(especesImpacteesFromFichierOdsArrayBuffer).not.toHaveBeenCalled();
});

test("returns nothing when the dossier has no espèces impactées file", () => {
  expect(loadEspecesImpactees({} as DossierFull)).toBe(undefined);
});
