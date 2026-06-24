import { expect, test, describe } from "vitest";

import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import { créerFiltreTexte } from "./filtresTexte.ts";

type Commune = { name: string; code: string; postalCode: string };

const commune = (name: string, postalCode = "33000"): Commune => ({
  name,
  code: "00000",
  postalCode,
});

function makeDossier(
  id: number,
  { nom = "Dossier test", communes = [] }: { nom?: string; communes?: Commune[] } = {},
): DossierRésumé {
  return { id: id as DossierRésumé["id"], nom, communes } as DossierRésumé;
}

/** Ids kept by the text filter, in input order */
function rechercher(texte: string, dossiers: DossierRésumé[]): number[] {
  return dossiers.filter(créerFiltreTexte(texte, dossiers)).map((dossier) => dossier.id);
}

const dossiers = [
  makeDossier(1, {
    nom: "Centrale photovoltaïque de Cleyrac",
    communes: [commune("Cleyrac", "33540")],
  }),
  makeDossier(2, { nom: "Parc éolien", communes: [commune("Saint-Émilion", "33330")] }),
  makeDossier(3, { nom: "Méthaniseur", communes: [commune("Bordeaux", "33000")] }),
  makeDossier(4, {
    nom: "Projet multi-sites",
    communes: [commune("Talence", "33400"), commune("Pessac", "33600")],
  }),
  makeDossier(5, { nom: "Projet sans localisation", communes: [] }),
];

describe("créerFiltreTexte — recherche par localisation", () => {
  test("trouve un dossier par le nom exact de sa commune", () => {
    expect(rechercher("Cleyrac", dossiers)).toEqual([1]);
  });

  test("ignore la casse et les accents", () => {
    expect(rechercher("BORDEAUX", dossiers)).toEqual([3]);
    expect(rechercher("emilion", dossiers)).toEqual([2]);
  });

  test("trouve une commune composée (avec tiret)", () => {
    expect(rechercher("Saint-Émilion", dossiers)).toEqual([2]);
  });

  test("trouve un dossier par l'une de ses communes parmi plusieurs", () => {
    expect(rechercher("Pessac", dossiers)).toEqual([4]);
  });

  test("ne retourne aucun dossier pour une commune absente", () => {
    expect(rechercher("Lyon", dossiers)).toEqual([]);
  });

  // Saisie partielle : pendant la frappe, un préfixe doit déjà trouver la commune.
  describe("saisie partielle (préfixe)", () => {
    test("« Cleyra » trouve « Cleyrac »", () => {
      expect(rechercher("Cleyra", dossiers)).toEqual([1]);
    });

    test("« Cley » trouve « Cleyrac »", () => {
      expect(rechercher("Cley", dossiers)).toEqual([1]);
    });

    test("« Bord » trouve « Bordeaux » (malgré la racinisation du mot)", () => {
      expect(rechercher("Bord", dossiers)).toEqual([3]);
    });

    test("un préfixe inconnu ne retourne rien", () => {
      expect(rechercher("Zzz", dossiers)).toEqual([]);
    });
  });
});
