import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { searchableText } from "./listModel.ts";
import { makeDossier, makeContext } from "./testHelpers.ts";

describe("searchableText — porteur de projet", () => {
  test("includes the name and SIRET of the porteur", () => {
    const morale = searchableText(
      makeDossier({
        porteur_de_projet: {
          type: "personne_morale",
          siret: "43229623400029",
          legal_name: "Pichet Immobilier",
        },
      } as Partial<DossierSummary>),
      makeContext(),
    );
    expect(morale).toContain("pichet immobilier");
    expect(morale).toContain("43229623400029");

    const physique = searchableText(
      makeDossier({
        porteur_de_projet: { type: "personne_physique", last_name: "Martin", first_names: "Élise" },
      } as Partial<DossierSummary>),
      makeContext(),
    );
    expect(physique).toContain("martin");
    expect(physique).toContain("elise");
  });
});
