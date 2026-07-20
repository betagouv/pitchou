import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { createTextFilter } from "./textFilters.ts";

type Commune = { name: string; code: string; postalCode: string };

const commune = (name: string, postalCode = "33000"): Commune => ({
  name,
  code: "00000",
  postalCode,
});

function makeDossier(
  id: number,
  { name = "Dossier test", communes = [] }: { name?: string; communes?: Commune[] } = {},
): DossierSummary {
  return { id: id as DossierSummary["id"], name, communes } as DossierSummary;
}

/** Ids kept by the text filter, in input order */
function search(text: string, dossiers: DossierSummary[]): number[] {
  return dossiers.filter(createTextFilter(text, dossiers)).map((dossier) => dossier.id);
}

const dossiers = [
  makeDossier(1, {
    name: "Centrale photovoltaïque de Cleyrac",
    communes: [commune("Cleyrac", "33540")],
  }),
  makeDossier(2, { name: "Parc éolien", communes: [commune("Saint-Émilion", "33330")] }),
  makeDossier(3, { name: "Méthaniseur", communes: [commune("Bordeaux", "33000")] }),
  makeDossier(4, {
    name: "Projet multi-sites",
    communes: [commune("Talence", "33400"), commune("Pessac", "33600")],
  }),
  makeDossier(5, { name: "Projet sans localisation", communes: [] }),
];

describe("createTextFilter — recherche par localisation", () => {
  test("trouve un dossier par le nom exact de sa commune", () => {
    expect(search("Cleyrac", dossiers)).toEqual([1]);
  });

  test("ignore la casse et les accents", () => {
    expect(search("BORDEAUX", dossiers)).toEqual([3]);
    expect(search("emilion", dossiers)).toEqual([2]);
  });

  test("trouve une commune composée (avec tiret)", () => {
    expect(search("Saint-Émilion", dossiers)).toEqual([2]);
  });

  test("trouve un dossier par l'une de ses communes parmi plusieurs", () => {
    expect(search("Pessac", dossiers)).toEqual([4]);
  });

  test("ne retourne aucun dossier pour une commune absente", () => {
    expect(search("Lyon", dossiers)).toEqual([]);
  });

  // Partial input: while typing, a prefix must already find the commune.
  describe("saisie partielle (préfixe)", () => {
    test("« Cleyra » trouve « Cleyrac »", () => {
      expect(search("Cleyra", dossiers)).toEqual([1]);
    });

    test("« Cley » trouve « Cleyrac »", () => {
      expect(search("Cley", dossiers)).toEqual([1]);
    });

    test("« Bord » trouve « Bordeaux » (malgré la racinisation du mot)", () => {
      expect(search("Bord", dossiers)).toEqual([3]);
    });

    test("un préfixe inconnu ne retourne rien", () => {
      expect(search("Zzz", dossiers)).toEqual([]);
    });
  });
});
