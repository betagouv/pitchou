import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { departements as officialDepartements } from "@pitchou/common/departements.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import {
  especeLabelByCD_REF,
  parseDossiersQuery,
  countActiveFilters,
  buildClearFiltersUpdates,
  clearFilters,
  activiteFilterEntries,
  listAvailableActivites,
  listAvailableDepartements,
  listAvailableInstructeurs,
} from "./listModel.ts";
import { dossierId, makeQuery, makeDossier } from "./testHelpers.ts";

describe("buildClearFiltersUpdates", () => {
  test("clears every filter but keeps the text search and the sort", () => {
    const params = new URLSearchParams({
      q: "photovoltaïque",
      phase: "Instruction",
      departement: "64",
      nouveaute: "oui",
      actionInstructeur: "1",
      from: "2024-01-01",
      sort: "lastModified",
    });
    // Apply the updates: every param set to null is removed from the URL.
    for (const [key, value] of Object.entries(buildClearFiltersUpdates())) {
      if (value === null) params.delete(key);
    }
    const next = parseDossiersQuery(params);

    expect(countActiveFilters(next)).toBe(0);
    expect(next.text).toBe("photovoltaïque");
    expect(next.sort).toBe("lastModified");
  });
});

describe("list available options", () => {
  test("listAvailableActivites dedupes by code, drops null and sorts alphabetically", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        activite_code: "conservation-especes",
        activite_label: "Conservation des espèces",
      }),
      makeDossier({ id: dossierId(2), activite_code: "carrieres", activite_label: "Carrières" }),
      // A renamed raw label resolving to the same activity counts as one option.
      makeDossier({
        id: dossierId(3),
        activite_code: "conservation-especes",
        activite_label: "Conservation des espèces",
      }),
      makeDossier({ id: dossierId(4), activite_code: null, activite_label: null }),
    ];
    expect(listAvailableActivites(dossiers)).toEqual([
      { code: "carrieres", label: "Carrières" },
      { code: "conservation-especes", label: "Conservation des espèces" },
    ]);
  });

  test("listAvailableActivites pins « Autre » last", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activite_code: "autre", activite_label: "Autre" }),
      makeDossier({ id: dossierId(2), activite_code: "zac", activite_label: "ZAC" }),
    ];
    expect(listAvailableActivites(dossiers).map(({ code }) => code)).toEqual(["zac", "autre"]);
  });

  test("activiteFilterEntries groups the available activities, flat without referentiel", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activite_code: "carrieres", activite_label: "Carrières" }),
      makeDossier({ id: dossierId(2), activite_code: "zac", activite_label: "ZAC" }),
      makeDossier({ id: dossierId(3), activite_code: "obsolete", activite_label: "Obsolète" }),
    ];
    const referentiel = {
      groupes: [
        { code: "activite-economique", label: "Activité économique", color: "#f6e7e1" },
        { code: "ecologie", label: "Écologie", color: "#d4f2c2" },
      ],
      activites: [
        { code: "carrieres", label: "Carrières", groupe_code: "activite-economique" },
        { code: "zac", label: "ZAC", groupe_code: "activite-economique" },
        { code: "gestion-eau", label: "Gestion de l'eau", groupe_code: "ecologie" },
      ],
    };

    expect(activiteFilterEntries(dossiers, null)).toEqual([
      { value: "carrieres", label: "Carrières" },
      { value: "obsolete", label: "Obsolète" },
      { value: "zac", label: "ZAC" },
    ]);

    const entries = activiteFilterEntries(dossiers, referentiel);
    // One group: « Écologie » has no dossier; the unknown code stays as a loose option.
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      label: "Activité économique",
      color: "#f6e7e1",
      options: [
        { value: "carrieres", label: "Carrières", color: "#f6e7e1" },
        { value: "zac", label: "ZAC", color: "#f6e7e1" },
      ],
    });
    expect(entries[1]).toEqual({ value: "obsolete", label: "Obsolète" });
  });

  test("listAvailableDepartements keeps the official list and appends unknown codes", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), departments: ["64"] }),
      makeDossier({ id: dossierId(2), departments: ["999"] }),
    ];
    const result = listAvailableDepartements(dossiers);

    expect(result).toHaveLength(officialDepartements.length + 1);
    expect(result.find((d) => d.code === "64")?.name).toBe("Pyrénées-Atlantiques");
    // An unknown code is surfaced with the code itself as label so it stays filterable.
    expect(result.some((d) => d.code === "999" && d.name === "999")).toBe(true);
  });

  test("listAvailableInstructeurs keeps only those following a dossier, sorted", () => {
    const followRelations = new Map<string, Set<DossierSummary["id"]>>([
      ["zoe@doe.fr", new Set([dossierId(1)])],
      ["amir@doe.fr", new Set([dossierId(2)])],
      ["personne@doe.fr", new Set()],
    ]);
    expect(listAvailableInstructeurs(followRelations)).toEqual(["amir@doe.fr", "zoe@doe.fr"]);
  });
});

describe("clearFilters", () => {
  test("resets every filter and the page but keeps the text search and the sort", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction"],
      enjeu: true,
      avisExpertManquant: true,
      sort: "lastModified",
      order: "asc",
      page: 3,
    });
    const cleared = clearFilters(query);

    expect(countActiveFilters(cleared)).toBe(0);
    expect(cleared.text).toBe("photovoltaïque");
    expect(cleared.sort).toBe("lastModified");
    expect(cleared.order).toBe("asc");
    expect(cleared.page).toBe(1);
  });
});

describe("especeLabelByCD_REF", () => {
  const espece: EspeceProtegee = {
    CD_REF: "2938",
    nomsVernaculaires: new Set(["Aigle royal", "Aigle doré"]),
    nomsScientifiques: new Set(["Aquila chrysaetos"]),
    classification: "oiseau",
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
  };

  test("labels each espèce with its first vernacular and scientific names", () => {
    expect(especeLabelByCD_REF(new Map([["2938", espece]]))).toEqual(
      new Map([["2938", "Aigle royal (Aquila chrysaetos)"]]),
    );
  });

  test("is empty while the référentiel has not loaded", () => {
    expect(especeLabelByCD_REF(undefined)).toEqual(new Map());
  });
});
