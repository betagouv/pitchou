import { describe, test, expect } from "vitest";

import { especeLabel } from "./classification.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

function makeEspece(overrides: Partial<EspeceProtegee> = {}): EspeceProtegee {
  return {
    CD_REF: "2938",
    nomsVernaculaires: new Set(["Aigle royal", "Aigle doré"]),
    nomsScientifiques: new Set(["Aquila chrysaetos"]),
    classification: "oiseau",
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
    ...overrides,
  };
}

describe("especeLabel", () => {
  test("pairs the first vernacular name with the first scientific one", () => {
    expect(especeLabel(makeEspece())).toBe("Aigle royal (Aquila chrysaetos)");
  });

  test("falls back to the scientific name alone when TAXREF has no nom vernaculaire", () => {
    const espece = makeEspece({
      nomsVernaculaires: new Set(),
      nomsScientifiques: new Set(["Salamandra salamandra salamandra"]),
    });
    expect(especeLabel(espece)).toBe("Salamandra salamandra salamandra");
  });

  test("never writes « undefined » into the label", () => {
    const espece = makeEspece({ nomsVernaculaires: new Set(), nomsScientifiques: new Set() });
    expect(especeLabel(espece)).toBe("");
  });
});
