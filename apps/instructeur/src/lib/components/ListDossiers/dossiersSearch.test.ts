import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import {
  addRecentSearch,
  filterDossiers,
  searchTerms,
  searchableText,
  dossierMatchesSearch,
} from "./dossiersList.ts";
import { dossierId, makeQuery, makeDossier, makeContext } from "./dossiersTestHelpers.ts";

/** Ids kept by the text search of `filterDossiers`, in input order */
function search(
  text: string,
  dossiers: DossierSummary[],
  followRelations?: Map<string, Set<DossierSummary["id"]>>,
): number[] {
  return filterDossiers(dossiers, makeQuery({ text }), makeContext({ followRelations }))
    .map((d) => d.id)
    .sort((a, b) => a - b);
}

describe("addRecentSearch", () => {
  test("prepends the trimmed search", () => {
    expect(addRecentSearch(["ancien"], "  photovoltaïque  ")).toEqual(["photovoltaïque", "ancien"]);
  });

  test("ignores a blank search", () => {
    expect(addRecentSearch(["ancien"], "   ")).toEqual(["ancien"]);
  });

  test("moves an existing term to the top without duplicating, case-insensitively", () => {
    expect(addRecentSearch(["carrière", "Photovoltaïque"], "photovoltaïque")).toEqual([
      "photovoltaïque",
      "carrière",
    ]);
  });

  test("caps the list at 3", () => {
    expect(addRecentSearch(["a", "b", "c"], "d")).toEqual(["d", "a", "b"]);
  });
});

describe("searchTerms", () => {
  test("splits on whitespace, strips accents and lowercases", () => {
    expect(searchTerms("  Élevage  Carrière ")).toEqual(["elevage", "carriere"]);
  });

  test("splits on punctuation so a partial numéro stays a single term", () => {
    expect(searchTerms("24, carriere")).toEqual(["24", "carriere"]);
  });

  test("returns nothing for an empty or blank query", () => {
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("searchableText", () => {
  test("gathers the searchable fields, département names included, normalised", () => {
    const dossier = makeDossier({
      name: "Parc",
      free_comment: "Champ de coquelicots",
      main_activite: "Carrières",
      departments: ["24"],
    });
    const haystack = searchableText(dossier, makeContext());
    expect(haystack).toContain("coquelicot");
    expect(haystack).toContain("carriere");
    expect(haystack).toContain("dordogne");
    expect(haystack).toContain("24");
  });

  test("includes the emails of the instructeurs following the dossier", () => {
    const dossier = makeDossier({ id: dossierId(7) });
    const followRelations = new Map([["vanessa.rispal@dreal.gouv.fr", new Set([dossierId(7)])]]);
    const haystack = searchableText(dossier, makeContext({ followRelations }));
    expect(haystack).toContain("vanessa.rispal");
  });
});

describe("dossierMatchesSearch", () => {
  test("keeps a dossier only when every term matches (AND)", () => {
    const dossier = makeDossier({ main_activite: "Carrières", departments: ["24"] });
    expect(dossierMatchesSearch(dossier, ["24", "carriere"], makeContext())).toBe(true);
    expect(dossierMatchesSearch(dossier, ["33", "carriere"], makeContext())).toBe(false);
  });

  test("matches everything when there is no term", () => {
    expect(dossierMatchesSearch(makeDossier(), [], makeContext())).toBe(true);
  });
});

describe("filterDossiers — recherche multi-champs (critères Trello)", () => {
  test("« coquelicot » trouve le dossier dont le commentaire mentionne les coquelicots", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), free_comment: "Présence de coquelicots sur la zone" }),
      makeDossier({ id: dossierId(2), name: "Parc éolien" }),
    ];
    expect(search("coquelicot", dossiers)).toEqual([1]);
  });

  test("« Rispal » trouve les dossiers suivis par Vanessa Rispal", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const followRelations = new Map([
      ["vanessa.rispal@dreal.gouv.fr", new Set([dossierId(1), dossierId(3)])],
      ["autre.personne@dreal.gouv.fr", new Set([dossierId(2)])],
    ]);
    expect(search("rispal", dossiers, followRelations)).toEqual([1, 3]);
    expect(search("vanessa", dossiers, followRelations)).toEqual([1, 3]);
  });

  test("« infrastructu » trouve les dossiers dont l'activité comporte « infrastructure »", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        main_activite: "Infrastructures de transport routières",
      }),
      makeDossier({ id: dossierId(2), main_activite: "Carrières" }),
    ];
    expect(search("infrastructu", dossiers)).toEqual([1]);
  });

  test("« dordogne » trouve les dossiers du département 24 par son nom", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), departments: ["24"] }),
      makeDossier({ id: dossierId(2), departments: ["33"] }),
    ];
    expect(search("dordogne", dossiers)).toEqual([1]);
  });

  test("« 24 carriere » croise le département et l'activité (ET)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), departments: ["24"], main_activite: "Carrières" }),
      makeDossier({
        id: dossierId(2),
        departments: ["24"],
        main_activite: "Conservation des espèces",
      }),
      makeDossier({ id: dossierId(3), departments: ["33"], main_activite: "Carrières" }),
    ];
    expect(search("24 carriere", dossiers)).toEqual([1]);
  });

  test("« 298037 » trouve le dossier dont le n° DN commence par ces chiffres", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), demarche_numerique_number: "29803745" }),
      makeDossier({ id: dossierId(2), demarche_numerique_number: "12345678" }),
    ];
    expect(search("298037", dossiers)).toEqual([1]);
  });

  test("« 98765 » trouve les dossiers dont un identifiant contient ces chiffres", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), demarche_numerique_number: "98765432" }),
      makeDossier({ id: dossierId(2), onagre_demande_identifier: "ONAGRE-98765" }),
      makeDossier({ id: dossierId(3), demarche_numerique_number: "11112222" }),
    ];
    expect(search("98765", dossiers)).toEqual([1, 2]);
  });

  test("recherche partielle sur le numéro de décision administrative", () => {
    const decision = [
      { number: "AP-2024-042" },
    ] as unknown as DossierSummary["decisionsAdministratives"];
    const dossiers = [
      makeDossier({ id: dossierId(1), decisionsAdministratives: decision }),
      makeDossier({ id: dossierId(2), decisionsAdministratives: [] }),
    ];
    expect(search("2024-042", dossiers)).toEqual([1]);
  });

  test("recherche encore une commune par son nom partiel", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        communes: [{ name: "Bordeaux", code: "33063", postalCode: "33000" }],
      }),
      makeDossier({ id: dossierId(2), communes: [] }),
    ];
    expect(search("bordeau", dossiers)).toEqual([1]);
  });
});
