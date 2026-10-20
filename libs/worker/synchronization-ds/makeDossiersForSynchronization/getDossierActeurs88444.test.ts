import { expect, test } from "vitest";
import { getDossierActeurs88444 } from "./getDossierActeurs88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

const emptyPersonne = {
  first_names: null,
  last_name: null,
  email: null,
  address: null,
  phone: null,
  role: null,
};

function acteursOf(
  champs: Partial<Record<keyof DossierDemarcheNumerique88444, string>>,
  overrides: object = {},
) {
  const dossier = {
    demandeur: { nom: "Martin", prenom: "Camille", email: "" },
    usager: { email: "Compte@Test.fr" },
    ...overrides,
  } as unknown as DossierDS88444;
  return getDossierActeurs88444(dossier, (key) => champs[key]);
}

test("without mandataire, the bénéficiaire is the déposant and its email falls back on the account", () => {
  expect(acteursOf({ "Le demandeur est…": "une personne morale" })).toEqual([
    {
      involvements: ["beneficiaire_demarche_numerique", "deposant"],
      personne: {
        ...emptyPersonne,
        first_names: "Camille",
        last_name: "Martin",
        email: "compte@test.fr",
      },
    },
  ]);
});

test("with a mandataire, the mandataire is the déposant and holds the account email", () => {
  expect(acteursOf({}, { nomMandataire: "Dupont", prenomMandataire: "Jean" })).toEqual([
    {
      involvements: ["beneficiaire_demarche_numerique"],
      personne: { ...emptyPersonne, first_names: "Camille", last_name: "Martin" },
    },
    {
      involvements: ["mandataire", "deposant"],
      personne: {
        ...emptyPersonne,
        first_names: "Jean",
        last_name: "Dupont",
        email: "compte@test.fr",
      },
    },
  ]);
});

test("the bénéficiaire points to the porteur personne physique", () => {
  expect(acteursOf({ "Le demandeur est…": "une personne physique" })).toEqual([
    { involvements: ["beneficiaire_demarche_numerique", "deposant"], porteur: true },
  ]);
});

test("the personne contact is filled from its champs, whatever the porteur type", () => {
  const contact = acteursOf({
    "Le demandeur est…": "une personne physique",
    "Nom du représentant": "Leroy",
    "Prénom du représentant": "Anne",
    "Qualité du représentant": "Gérante",
    "Numéro de téléphone de contact": "0612345678",
    "Adresse mail de contact": "Contact@Test.fr",
  }).at(-1);
  expect(contact).toEqual({
    involvements: ["personne_contact"],
    personne: {
      ...emptyPersonne,
      first_names: "Anne",
      last_name: "Leroy",
      email: "contact@test.fr",
      phone: "0612345678",
      role: "Gérante",
    },
  });
  expect(acteursOf({ "Numéro de téléphone de contact": "0612345678" }).at(-1)).toMatchObject({
    involvements: ["personne_contact"],
    personne: { phone: "0612345678" },
  });
});

test("no personne contact when none of its champs is filled", () => {
  expect(
    acteursOf({ "Le demandeur est…": "une personne morale" }).map(
      ({ involvements }) => involvements,
    ),
  ).toEqual([["beneficiaire_demarche_numerique", "deposant"]]);
});
