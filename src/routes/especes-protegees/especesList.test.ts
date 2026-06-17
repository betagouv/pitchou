import { describe, it, expect } from "vitest";

import type { EspèceProtégée } from "$types/especes.d.ts";
import { parseEspecesQuery, filterEspeces, matchesText, compareEspeces } from "./especesList.ts";

// Builds an EspèceProtégée with sensible defaults; override only what a test cares about.
function makeEspece(overrides: Partial<EspèceProtégée> = {}): EspèceProtégée {
  return {
    CD_REF: "2437",
    classification: "oiseau",
    nomsScientifiques: new Set(["Morus bassanus"]),
    nomsVernaculaires: new Set(["Fou de Bassan"]),
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
    ...overrides,
  };
}

function params(init: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams(init);
}

describe("parseEspecesQuery", () => {
  it("returns the defaults for empty params", () => {
    expect(parseEspecesQuery(params())).toEqual({
      searchText: "",
      classification: "",
      statut: "",
      liste: "",
      sort: "nomScientifique",
      order: "asc",
      page: 1,
    });
  });

  it("reads valid values straight from the URL", () => {
    const query = parseEspecesQuery(
      params({
        q: "fou",
        classification: "flore",
        statut: "PR",
        liste: "cnpn",
        tri: "cdref",
        ordre: "desc",
        page: "3",
      }),
    );

    expect(query).toEqual({
      searchText: "fou",
      classification: "flore",
      statut: "PR",
      liste: "cnpn",
      sort: "cdref",
      order: "desc",
      page: 3,
    });
  });

  it("falls back to no filter for an unknown classification", () => {
    expect(parseEspecesQuery(params({ classification: "champignon" })).classification).toBe("");
  });

  it("falls back to no filter for an unknown statut", () => {
    expect(parseEspecesQuery(params({ statut: "ZZ" })).statut).toBe("");
  });

  it("falls back to no filter for an unknown liste", () => {
    expect(parseEspecesQuery(params({ liste: "autre" })).liste).toBe("");
  });

  it("falls back to the default sort for an unknown tri", () => {
    expect(parseEspecesQuery(params({ tri: "couleur" })).sort).toBe("nomScientifique");
  });

  it("only treats ordre=desc as descending", () => {
    expect(parseEspecesQuery(params({ ordre: "desc" })).order).toBe("desc");
    expect(parseEspecesQuery(params({ ordre: "asc" })).order).toBe("asc");
    expect(parseEspecesQuery(params({ ordre: "n'importe quoi" })).order).toBe("asc");
  });

  it("rejects non-positive or non-integer pages, keeping page 1", () => {
    expect(parseEspecesQuery(params({ page: "0" })).page).toBe(1);
    expect(parseEspecesQuery(params({ page: "-2" })).page).toBe(1);
    expect(parseEspecesQuery(params({ page: "abc" })).page).toBe(1);
    expect(parseEspecesQuery(params({ page: "2.5" })).page).toBe(1);
    expect(parseEspecesQuery(params({ page: "4" })).page).toBe(4);
  });
});

describe("matchesText", () => {
  const espece = makeEspece({
    nomsScientifiques: new Set(["Morus bassanus"]),
    nomsVernaculaires: new Set(["Fou de Bassan"]),
  });

  it("matches a substring of a scientific name", () => {
    expect(matchesText(espece, "morus")).toBe(true);
  });

  it("matches a substring of a vernacular name", () => {
    expect(matchesText(espece, "fou")).toBe(true);
  });

  it("is accent- and case-insensitive", () => {
    expect(matchesText(makeEspece({ nomsVernaculaires: new Set(["Fôu"]) }), "FOU")).toBe(true);
  });

  it("requires every word to match (AND), across all name fields", () => {
    // "morus" only in the scientific name, "fou" only in the vernacular one
    expect(matchesText(espece, "morus fou")).toBe(true);
  });

  it("fails when one of the words matches nothing", () => {
    expect(matchesText(espece, "morus tazetta")).toBe(false);
  });
});

describe("filterEspeces", () => {
  const oiseauPN = makeEspece({
    CD_REF: "1",
    classification: "oiseau",
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: "O",
  });
  const florePR = makeEspece({
    CD_REF: "2",
    classification: "flore",
    nomsScientifiques: new Set(["Narcissus tazetta"]),
    nomsVernaculaires: new Set(["Narcisse"]),
    CD_TYPE_STATUTS: new Set(["PR"]),
    espèceCNPN: "O",
  });
  const especes = [oiseauPN, florePR];

  const emptyQuery = parseEspecesQuery(params());

  it("returns everything when no filter is active", () => {
    expect(filterEspeces(especes, emptyQuery)).toEqual(especes);
  });

  it("filters by classification", () => {
    expect(filterEspeces(especes, { ...emptyQuery, classification: "flore" })).toEqual([florePR]);
  });

  it("filters by statut via CD_TYPE_STATUTS membership", () => {
    expect(filterEspeces(especes, { ...emptyQuery, statut: "PN" })).toEqual([oiseauPN]);
  });

  it("filters the ministerielle list", () => {
    expect(filterEspeces(especes, { ...emptyQuery, liste: "ministerielle" })).toEqual([oiseauPN]);
  });

  it("filters the cnpn list", () => {
    expect(filterEspeces(especes, { ...emptyQuery, liste: "cnpn" })).toEqual([florePR]);
  });

  it("combines attribute filters with the text search", () => {
    expect(
      filterEspeces(especes, { ...emptyQuery, classification: "flore", searchText: "narcisse" }),
    ).toEqual([florePR]);
    expect(
      filterEspeces(especes, { ...emptyQuery, classification: "oiseau", searchText: "narcisse" }),
    ).toEqual([]);
  });
});

describe("compareEspeces", () => {
  it("sorts CD_REF numerically, not lexicographically", () => {
    const a = makeEspece({ CD_REF: "100" });
    const b = makeEspece({ CD_REF: "20" });
    // Lexicographically "100" < "20", numerically 100 > 20
    expect(compareEspeces(a, b, "cdref", "asc")).toBeGreaterThan(0);
  });

  it("sorts scientific names alphabetically", () => {
    const a = makeEspece({ nomsScientifiques: new Set(["Aquila chrysaetos"]) });
    const b = makeEspece({ nomsScientifiques: new Set(["Morus bassanus"]) });
    expect(compareEspeces(a, b, "nomScientifique", "asc")).toBeLessThan(0);
  });

  it("sorts vernacular names alphabetically", () => {
    const a = makeEspece({ nomsVernaculaires: new Set(["Aigle"]) });
    const b = makeEspece({ nomsVernaculaires: new Set(["Fou"]) });
    expect(compareEspeces(a, b, "nomVernaculaire", "asc")).toBeLessThan(0);
  });

  it("inverts the order when descending", () => {
    const a = makeEspece({ CD_REF: "1" });
    const b = makeEspece({ CD_REF: "2" });
    expect(compareEspeces(a, b, "cdref", "asc")).toBeLessThan(0);
    expect(compareEspeces(a, b, "cdref", "desc")).toBeGreaterThan(0);
  });
});
