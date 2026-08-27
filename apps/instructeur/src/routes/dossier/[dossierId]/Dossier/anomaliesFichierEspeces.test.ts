import { expect, test, vi } from "vitest";

vi.mock(import("$lib/dossier/dossier.ts"), () => ({
  especesImpacteesFromFichierOdsArrayBuffer: vi.fn(),
}));

import { especesImpacteesFromFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";
import { anomaliesFichierEspeces } from "./anomaliesFichierEspeces.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

function dossierWithFichier(name: string): DossierFull {
  return {
    especesImpactees: {
      sourceFile: { name, media_type: null, url: "https://example.org/fichier" },
      impacts: [],
    },
  } as unknown as DossierFull;
}

test("reports an anomaly instead of rejecting when the file is neither .ods nor .xlsx", async () => {
  const anomalies = await anomaliesFichierEspeces(dossierWithFichier("especes-impactees.pdf"));

  expect(anomalies).toEqual([
    {
      message:
        "le fichier « especes-impactees.pdf » n’est ni un .ods ni un .xlsx : il n’a pas pu être lu",
    },
  ]);
  expect(especesImpacteesFromFichierOdsArrayBuffer).not.toHaveBeenCalled();
});

test("returns nothing when the dossier has no espèces impactées file", () => {
  const dossier = {
    especesImpactees: { sourceFile: undefined, impacts: [] },
  } as unknown as DossierFull;

  expect(anomaliesFichierEspeces(dossier)).toBe(undefined);
});
