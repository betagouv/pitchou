import { expect, test } from "vitest";
import { getPersonnesEntreprisesData88444 } from "./getPersonnesEntreprisesData88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

test("physical applicant contact values are stored in the dossier identity, including cleared values", () => {
  const fields = new Map<keyof DossierDemarcheNumerique88444, string>([
    ["Le demandeur est…", "type"],
    ["Numéro de téléphone de contact", "phone"],
    ["Adresse mail de contact", "email"],
    ["Qualification", "role"],
  ]);
  const dossier = {
    demandeur: { nom: "Martin", prenom: "Camille", email: "compte@test.fr" },
    usager: { email: "compte@test.fr" },
    champs: [
      { id: "type", stringValue: "une personne physique" },
      { id: "phone", stringValue: "0102030405" },
      { id: "email", stringValue: "contact@test.fr" },
      { id: "role", stringValue: "Écologue" },
    ],
  } as unknown as DossierDS88444;
  expect(getPersonnesEntreprisesData88444(dossier, fields).identites[0]).toMatchObject({
    type: "demandeur",
    first_names: "Camille",
    last_name: "Martin",
    email: "contact@test.fr",
    phone: "0102030405",
    role: "Écologue",
  });
  dossier.champs = dossier.champs.filter(({ id }) => id !== "phone" && id !== "role");
  expect(getPersonnesEntreprisesData88444(dossier, fields).identites[0]).toMatchObject({
    phone: null,
    role: null,
  });
});

const porteurFields = new Map<keyof DossierDemarcheNumerique88444, string>([
  ["Le demandeur est…", "type"],
  ["Numéro de téléphone de contact", "phone"],
  ["Adresse mail de contact", "email"],
  ["Qualification", "role"],
  ["Adresse", "address"],
  ["Numéro de SIRET", "siret"],
]);

function porteurOf(champs: object[], overrides: object = {}) {
  const dossier = {
    demandeur: { nom: "Martin", prenom: "Camille", email: "Beneficiaire@Test.fr" },
    usager: { email: "compte@test.fr" },
    champs,
    ...overrides,
  } as unknown as DossierDS88444;
  return getPersonnesEntreprisesData88444(dossier, porteurFields).porteur_de_projet;
}

test("porteur personne physique is built from the bénéficiaire and the form champs", () => {
  expect(
    porteurOf([
      { id: "type", stringValue: "une personne physique" },
      { id: "phone", stringValue: "0612345678" },
      { id: "email", stringValue: "contact@test.fr" },
      { id: "role", stringValue: "Agriculteur" },
      {
        id: "address",
        address: {
          streetAddress: "1 rue du Parc",
          postalCode: "40000",
          cityName: "Mont-de-Marsan",
        },
      },
    ]),
  ).toEqual({
    personne_physique: {
      first_names: "Camille",
      last_name: "Martin",
      email: "contact@test.fr",
      address: "1 rue du Parc\n40000 Mont-de-Marsan",
      phone: "0612345678",
      role: "Agriculteur",
    },
  });
});

test("porteur personne physique falls back to the bénéficiaire email and keeps missing values null", () => {
  expect(porteurOf([{ id: "type", stringValue: "une personne physique" }])).toEqual({
    personne_physique: {
      first_names: "Camille",
      last_name: "Martin",
      email: "beneficiaire@test.fr",
      address: null,
      phone: null,
      role: null,
    },
  });
});

test("porteur personne physique is the bénéficiaire, not the mandataire", () => {
  const porteur = porteurOf([{ id: "type", stringValue: "une personne physique" }], {
    nomMandataire: "Dupont",
    prenomMandataire: "Jean",
  });
  expect(porteur).toMatchObject({
    personne_physique: { first_names: "Camille", last_name: "Martin" },
  });
});

test("porteur personne morale uses the SIRET of the etablissement", () => {
  expect(
    porteurOf([
      { id: "type", stringValue: "une personne morale" },
      { id: "siret", stringValue: "12345678900001", etablissement: { siret: "12345678900001" } },
    ]),
  ).toEqual({ personne_morale: "12345678900001" });
});

test("porteur personne morale falls back to the entered SIRET without etablissement", () => {
  expect(
    porteurOf([
      { id: "type", stringValue: "une personne morale" },
      { id: "siret", stringValue: "123 456 789 00001", etablissement: null },
    ]),
  ).toEqual({ personne_morale: "12345678900001" });
});

test("no porteur without type or without a valid SIRET", () => {
  expect(porteurOf([])).toBeUndefined();
  expect(porteurOf([{ id: "type", stringValue: "une personne morale" }])).toBeUndefined();
  expect(
    porteurOf([
      { id: "type", stringValue: "une personne morale" },
      { id: "siret", stringValue: "1234", etablissement: null },
    ]),
  ).toBeUndefined();
});
