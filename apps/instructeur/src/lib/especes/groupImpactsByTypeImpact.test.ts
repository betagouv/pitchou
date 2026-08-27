import { expect, test } from "vitest";

import { groupImpactsByTypeImpact } from "./groupImpactsByTypeImpact.ts";

import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";

const CAPTURE: NonNullable<FrontEndImpactOnEspece["typeImpact"]> = {
  identifiantPitchou: "P-2-1",
  libelle: "Capture pour captivité",
  criteriaAllowed: ["Nombre d'individus"],
};

function impact(overrides: Partial<FrontEndImpactOnEspece> = {}): FrontEndImpactOnEspece {
  return {
    espece: {
      CD_REF: "2437",
      nomVernaculaire: "Fou de Bassan",
      nomScientifique: "Morus bassanus",
      especeCNPN: true,
      especeMinisterielle: false,
    },
    typeImpact: CAPTURE,
    methode: null,
    moyenDePoursuite: null,
    nombreIndividus: "11-100",
    nids: null,
    oeufs: null,
    surfaceHabitatDetruit: null,
    ...overrides,
  };
}

test("regroupe les espèces sous le libellé de leur type d'impact", () => {
  const groupes = groupImpactsByTypeImpact([impact()]);

  expect(groupes).toHaveLength(1);
  expect(groupes[0].typeImpact).toBe("Capture pour captivité");
  expect(groupes[0].criteriaAllowed).toEqual(["Nombre d'individus"]);
  expect(groupes[0].especes).toEqual([
    {
      CD_REF: "2437",
      nomVernaculaire: "Fou de Bassan",
      nomScientifique: "Morus bassanus",
      especeCNPN: true,
      especeMinisterielle: false,
      impactsValues: ["11-100"],
    },
  ]);
});

test("une valeur absente est signalée comme non renseignée", () => {
  const [groupe] = groupImpactsByTypeImpact([impact({ nombreIndividus: null })]);

  expect(groupe.especes[0].impactsValues).toEqual(["(non renseigné)"]);
});

test("n'affiche que les critères que le type d'impact accepte", () => {
  // The fichier espèce can hold a value for a critère the type d'impact does not accept; it is
  // not a column of that table, so it is not shown.
  const [groupe] = groupImpactsByTypeImpact([impact({ nids: 12 })]);

  expect(groupe.criteriaAllowed).toEqual(["Nombre d'individus"]);
  expect(groupe.especes[0].impactsValues).toEqual(["11-100"]);
});

test("les lignes sans type d'impact forment leur propre groupe, sans colonne", () => {
  const groupes = groupImpactsByTypeImpact([impact(), impact({ typeImpact: null })]);

  expect(groupes.map(({ typeImpact }) => typeImpact)).toEqual([
    "Capture pour captivité",
    "Type d'impact non-renseignée",
  ]);
  expect(groupes[1].criteriaAllowed).toEqual([]);
  expect(groupes[1].especes[0].impactsValues).toEqual([]);
});

test("les espèces d'un groupe sont triées par nom scientifique", () => {
  const groupes = groupImpactsByTypeImpact([
    impact({
      espece: {
        CD_REF: "3",
        nomVernaculaire: "Zostère",
        nomScientifique: "Zostera marina",
        especeCNPN: false,
        especeMinisterielle: false,
      },
    }),
    impact(),
  ]);

  expect(groupes[0].especes.map(({ nomScientifique }) => nomScientifique)).toEqual([
    "Morus bassanus",
    "Zostera marina",
  ]);
});
