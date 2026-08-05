import { expect, test } from "vitest";

import { getDocumentGenerationTags } from "./generateDocument.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

test("génère les balises sans espèces impactées", () => {
  const dossier = {
    id: "dossier-1",
    name: "Dossier sans espèces",
  } as unknown as DossierFull;

  const tags = getDocumentGenerationTags(dossier, undefined, new Map());

  expect(tags.nom).toBe("Dossier sans espèces");
  expect(tags.localisation).toBe("(inconnue)");
  expect(tags.liste_espèces_par_impact).toBeUndefined();
});
