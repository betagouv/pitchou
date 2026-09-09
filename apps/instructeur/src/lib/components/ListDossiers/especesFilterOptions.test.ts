import { expect, test, describe } from "vitest";

import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import {
  countEspecesFilters,
  emptyEspecesFilters,
  matchesEspeceFilters,
  type EspecesFilters,
} from "./especesFilterOptions.ts";

function makeEspece(overrides: Partial<EspeceProtegee> = {}): EspeceProtegee {
  return {
    CD_REF: "2938",
    nomsVernaculaires: new Set(["Aigle royal"]),
    nomsScientifiques: new Set(["Aquila chrysaetos"]),
    classification: "oiseau",
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
    ...overrides,
  };
}

function makeFilters(overrides: Partial<EspecesFilters> = {}): EspecesFilters {
  return { ...emptyEspecesFilters(), ...overrides };
}

describe("matchesEspeceFilters", () => {
  test("keeps every espèce when no filter is selected", () => {
    expect(matchesEspeceFilters(makeEspece(), emptyEspecesFilters())).toBe(true);
  });

  test("combines the types d'espèce with OR", () => {
    const filters = makeFilters({ classifications: ["oiseau", "flore"] });
    expect(matchesEspeceFilters(makeEspece({ classification: "flore" }), filters)).toBe(true);
    expect(matchesEspeceFilters(makeEspece({ classification: "faune non-oiseau" }), filters)).toBe(
      false,
    );
  });

  test("keeps an espèce carrying any of the selected statuts", () => {
    const filters = makeFilters({ statuts: ["PR", "POM"] });
    expect(
      matchesEspeceFilters(makeEspece({ CD_TYPE_STATUTS: new Set(["PN", "PR"]) }), filters),
    ).toBe(true);
    expect(matchesEspeceFilters(makeEspece({ CD_TYPE_STATUTS: new Set(["PN"]) }), filters)).toBe(
      false,
    );
  });

  test("reads the instance consultative from the CNPN and ministérielle flags", () => {
    const cnpn = makeEspece({ espèceCNPN: "O" });
    const ministerielle = makeEspece({ espèceMinistérielle: "O" });
    expect(matchesEspeceFilters(cnpn, makeFilters({ instances: ["cnpn"] }))).toBe(true);
    expect(matchesEspeceFilters(ministerielle, makeFilters({ instances: ["cnpn"] }))).toBe(false);
    expect(
      matchesEspeceFilters(ministerielle, makeFilters({ instances: ["cnpn", "ministerielle"] })),
    ).toBe(true);
  });

  test("combines the three groups with AND", () => {
    const filters = makeFilters({ classifications: ["oiseau"], statuts: ["PN"] });
    expect(matchesEspeceFilters(makeEspece(), filters)).toBe(true);
    expect(matchesEspeceFilters(makeEspece({ classification: "flore" }), filters)).toBe(false);
  });
});

test("countEspecesFilters sums the selected values of every group", () => {
  expect(countEspecesFilters(emptyEspecesFilters())).toBe(0);
  expect(
    countEspecesFilters(
      makeFilters({ classifications: ["oiseau"], statuts: ["PN", "PR"], instances: ["cnpn"] }),
    ),
  ).toBe(4);
});
