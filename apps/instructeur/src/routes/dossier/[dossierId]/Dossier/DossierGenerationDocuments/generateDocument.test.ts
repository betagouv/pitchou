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

test("utilise le département principal explicite dans les balises", () => {
  const dossier = {
    id: "dossier-1",
    name: "Dossier multi-départements",
    primary_department: "75",
    departments: ["69"],
  } as unknown as DossierFull;

  const tags = getDocumentGenerationTags(dossier, undefined, new Map());

  expect(tags.département_principal).toBe("75");
  expect(tags.nom_département_principal).toBe("Paris");
  expect(tags.liste_départements).toEqual(["69"]);
});
