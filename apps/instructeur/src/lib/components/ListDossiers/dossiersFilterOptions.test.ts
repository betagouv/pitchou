import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { départements as officialDepartements } from "@pitchou/common/départements.ts";
import {
  parseDossiersQuery,
  countActiveFilters,
  buildClearFiltersUpdates,
  clearFilters,
  listAvailableActivites,
  listAvailableDepartements,
  listAvailableInstructeurs,
} from "./dossiersList.ts";
import { dossierId, makeQuery, makeDossier } from "./dossiersTestHelpers.ts";

describe("buildClearFiltersUpdates", () => {
  test("clears every filter but keeps the text search and the sort", () => {
    const params = new URLSearchParams({
      q: "photovoltaïque",
      phase: "Instruction",
      departement: "64",
      nouveaute: "oui",
      actionInstructeur: "1",
      from: "2024-01-01",
      sort: "name",
    });
    // Apply the updates: every param set to null is removed from the URL.
    for (const [key, value] of Object.entries(buildClearFiltersUpdates())) {
      if (value === null) params.delete(key);
    }
    const next = parseDossiersQuery(params);

    expect(countActiveFilters(next)).toBe(0);
    expect(next.text).toBe("photovoltaïque");
    expect(next.sort).toBe("name");
  });
});

describe("list available options", () => {
  test("listAvailableActivites dedupes, drops null and sorts alphabetically", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activité_principale: "Conservation des espèces" }),
      makeDossier({ id: dossierId(2), activité_principale: "Carrières" }),
      makeDossier({ id: dossierId(3), activité_principale: "Conservation des espèces" }),
      makeDossier({ id: dossierId(4), activité_principale: null }),
    ];
    expect(listAvailableActivites(dossiers)).toEqual(["Carrières", "Conservation des espèces"]);
  });

  test("listAvailableDepartements keeps the official list and appends unknown codes", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), départements: ["64"] }),
      makeDossier({ id: dossierId(2), départements: ["999"] }),
    ];
    const result = listAvailableDepartements(dossiers);

    expect(result).toHaveLength(officialDepartements.length + 1);
    expect(result.find((d) => d.code === "64")?.nom).toBe("Pyrénées-Atlantiques");
    // An unknown code is surfaced with the code itself as label so it stays filterable.
    expect(result.some((d) => d.code === "999" && d.nom === "999")).toBe(true);
  });

  test("listAvailableInstructeurs keeps only those following a dossier, sorted", () => {
    const relationSuivis = new Map<string, Set<DossierSummary["id"]>>([
      ["zoe@doe.fr", new Set([dossierId(1)])],
      ["amir@doe.fr", new Set([dossierId(2)])],
      ["personne@doe.fr", new Set()],
    ]);
    expect(listAvailableInstructeurs(relationSuivis)).toEqual(["amir@doe.fr", "zoe@doe.fr"]);
  });
});

describe("clearFilters", () => {
  test("resets every filter and the page but keeps the text search and the sort", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction"],
      enjeu: true,
      avisExpertManquant: true,
      sort: "name",
      order: "asc",
      page: 3,
    });
    const cleared = clearFilters(query);

    expect(countActiveFilters(cleared)).toBe(0);
    expect(cleared.text).toBe("photovoltaïque");
    expect(cleared.sort).toBe("name");
    expect(cleared.order).toBe("asc");
    expect(cleared.page).toBe(1);
  });
});
