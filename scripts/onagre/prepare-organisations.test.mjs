import test from "node:test";
import assert from "node:assert/strict";
import { prepareDeclaredOrganisation } from "./prepare-organisations.mjs";

const source = (overrides = {}) => ({
  projetid: "42",
  codeprojet: "TEST-42",
  precisionpetitionnaire: "Association des marais",
  nompersonne: "Martin",
  prenompersonne: "Camille",
  adressepetitionnaire: "Adresse source",
  ...overrides,
});
const prepare = (project, demandes = []) =>
  prepareDeclaredOrganisation(project, demandes, "Personne Morale");

test("holds changed beneficiaries, co-owners, affiliations and governance descriptions", () => {
  assert.equal(
    prepare(source(), [{ cmtdemande: "Le bénéficiaire est remplacé par une autre société" }])
      .porteur,
    null,
  );
  for (const name of [
    "SAS Nord et SAS Sud",
    "Mairie de Banyuls sur Mer et USSAP/ASCV",
    "HERREL Anthony (CNRS/MNHN)",
    "Société Anonyme à Directoire et Conseil de Surveillance",
    "ENTREPRISE SOCIALE POUR L'HABITAT - SOCIETE ANONYME D'HABITATIONS A LOYER MODERE",
  ]) {
    assert.equal(prepare(source({ precisionpetitionnaire: name })).porteur, null, name);
  }
  assert.equal(
    prepare(source({ cmtprojet: "Projet porté par 2 maîtres d’ouvrage" })).porteur,
    null,
  );
});

test("keeps original source name and address without fabricating registry identifiers", () => {
  const result = prepare(source());
  assert.equal(result.porteur.values.name, "Association des marais");
  assert.equal(result.porteur.values.address, "Adresse source");
  assert.equal(result.porteur.values.siren, null);
  assert.equal(result.porteur.values.verification_evidence, null);
  assert.equal(result.porteur.values.verification_status, "source_declared");
});
test("does not turn a contact or category-only institution into an organisation", () => {
  assert.equal(
    prepare(source({ precisionpetitionnaire: "", nompersonne: "Martin" })).porteur,
    null,
  );
  assert.equal(prepareDeclaredOrganisation(source(), [], "Personne Physique").porteur, null);
  assert.equal(
    prepare(source({ precisionpetitionnaire: "M. Martin", nompersonne: "Association des marais" }))
      .porteur,
    null,
  );
});
test("accepts an organisational name in the source name field with a generic precision", () => {
  assert.equal(
    prepare(
      source({ precisionpetitionnaire: "association", nompersonne: "Association des marais" }),
    ).porteur.values.name,
    "Association des marais",
  );
});
test("keeps representative and multiple-owner conflicts for review", () => {
  assert.equal(prepare(source({ cmtprojet: "Agit pour le compte de la société X" })).porteur, null);
  assert.equal(prepare(source({ cmtprojet: "Projet avec 3 sociétés" })).porteur, null);
  assert.equal(prepare(source(), [{ nommandataire: "Association des marais" }]).porteur, null);
  assert.equal(
    prepare(source({ cmtprojet: "Plusieurs pétitionnaires : syndicat et communes" })).porteur,
    null,
  );
  assert.equal(
    prepare(source({ precisionpetitionnaire: "Métropole confie à Prestataire" })).porteur,
    null,
  );
});

test("does not trust contact names or instruction notes in the precision field", () => {
  for (const name of [
    "Groupe",
    "Réserve Naturelle Nationale",
    "Société Anonyme d’HLM",
    "Société d’économie mixte",
    "société anonyme d’habitation à loyer modéré",
  ]) {
    assert.equal(prepare(source({ precisionpetitionnaire: name })).porteur, null, name);
  }
  assert.equal(
    prepare(
      source({
        precisionpetitionnaire: "Camille MARTIN",
        prenompersonne: "",
        nompersonne: "SOCIETE EXEMPLE",
      }),
    ).porteur,
    null,
  );
  assert.equal(
    prepare(source({ precisionpetitionnaire: "Instruction : Direction du service" })).porteur,
    null,
  );
  assert.equal(
    prepare(
      source({ precisionpetitionnaire: "SAS", nompersonne: "Nom inconnu", prenompersonne: "" }),
    ).porteur,
    null,
  );
});
