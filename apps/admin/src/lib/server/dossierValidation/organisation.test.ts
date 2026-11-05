import { expect, test } from "vitest";
import { parseMinimalCreationRelations } from "./minimalCreation.ts";
import { parseDossierRelations } from "./relationsValidation.ts";

const organisation = {
  name: "Association des marais",
  address: "Adresse déclarée",
  siren: null,
  verification_status: "source_declared",
  source: "Onagre",
  source_reference: "Projet 42",
  verification_evidence: null,
};
const relations = (value: unknown) => ({
  demandeur_type: "organisation",
  demandeur_personne_physique: null,
  demandeur_personne_morale: null,
  demandeur_organisation: value,
  identites: [],
});

test("accepts a source declaration without a fictitious SIRET or contact", () => {
  expect(
    parseMinimalCreationRelations({ porteur_de_projet: { type: "organisation", ...organisation } }),
  ).toEqual(relations(organisation));
  expect(parseDossierRelations(relations(organisation))).toEqual(relations(organisation));
});

test("a verified organisation requires evidence and can retain its SIREN", () => {
  const verified = {
    ...organisation,
    verification_status: "verified",
    siren: "123456789",
    verification_evidence: "Document officiel identifiant la personne morale",
  };
  expect(parseDossierRelations(relations(verified))).toEqual(relations(verified));
});

test.each([
  { name: " " },
  { source: "" },
  { source_reference: "" },
  { siren: "123456789" },
  { verification_status: "verified" },
  { verification_status: "verified", siren: "123", verification_evidence: "Preuve" },
  { siret: "12345678900012" },
  { id: 1 },
  { verification_evidence: "Unverified claim" },
])("rejects invalid or misleading organisation declarations %j", (change) => {
  expect(() => parseDossierRelations(relations({ ...organisation, ...change }))).toThrow();
});

test("rejects simultaneous organisation and establishment identities", () => {
  expect(() =>
    parseDossierRelations({
      ...relations(organisation),
      demandeur_personne_morale: { siret: "12345678900012" },
    }),
  ).toThrow();
  expect(() =>
    parseDossierRelations({ ...relations(organisation), demandeur_type: "personne_morale" }),
  ).toThrow();
});
