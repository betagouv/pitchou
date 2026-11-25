import test from "node:test";
import assert from "node:assert/strict";
import { actorProposal, assertReplaceableContacts, validateActors } from "./actors.mjs";
import {
  emailMatchesPerson,
  sourceActors,
  splitCoordinateur,
  truncateAddress,
} from "./actors/source.mjs";
const person = {
  first_names: "Camille",
  last_name: "Exemple",
  email: null,
  address: null,
  phone: null,
  role: null,
};
const contact = { sourceKey: "onagre-national:projet:1:contact", values: person };
test("prepared people require identities, explicit fields and valid emails", () => {
  validateActors({ contacts: [contact], porteur: { type: "personne_physique", values: person } });
  assert.throws(() => validateActors({ contacts: [contact, contact] }), /duplicate/u);
  assert.throws(
    () =>
      validateActors({
        contacts: [{ ...contact, values: { ...person, first_names: null, last_name: null } }],
      }),
    /identity/u,
  );
  assert.throws(
    () => validateActors({ contacts: [{ ...contact, values: { ...person, email: "0" } }] }),
    /identity/u,
  );
  assert.throws(
    () => validateActors({ contacts: [{ ...contact, values: { ...person, account: true } }] }),
    /identity/u,
  );
});
test("organisations require verifiable evidence, not only a SIRET candidate", () => {
  const porteur = {
    type: "personne_morale",
    siret: "00000000000000",
    values: {
      legal_name: "Synthetic organisation",
      address: null,
      postal_code: null,
      insee_code: null,
    },
    verification: {
      status: "verified",
      reason: "Synthetic establishment evidence",
      sources: ["https://example.test/registry"],
    },
  };
  validateActors({ porteur });
  assert.throws(
    () =>
      validateActors({
        porteur: { ...porteur, verification: { ...porteur.verification, status: "candidate" } },
      }),
    /verified/u,
  );
  assert.throws(
    () =>
      validateActors({
        porteur: { ...porteur, verification: { ...porteur.verification, sources: [] } },
      }),
    /verified/u,
  );
  validateActors({ contacts: [], porteur: null });
});

test("organisations without SIRET keep declarations distinct from verified identities", () => {
  const values = {
    name: "Synthetic association",
    address: null,
    siren: null,
    verification_status: "source_declared",
    source: "onagre-national",
    source_reference: "projet:123:precisionpetitionnaire",
    verification_evidence: null,
  };
  const validate = (overrides = {}) =>
    validateActors({ porteur: { type: "organisation", values: { ...values, ...overrides } } });
  validate();
  validate({
    verification_status: "verified",
    verification_evidence: "Registry and historical address match",
    siren: "123456789",
  });
  validate({
    verification_status: "verified",
    verification_evidence: "Official association directory without SIREN",
  });
  for (const invalid of [
    { siren: "123456789" },
    { verification_evidence: "Unverified candidate" },
    { verification_status: "verified" },
    { verification_status: "verified", verification_evidence: " " },
    { verification_status: "candidate" },
    { name: null },
    { source: " " },
    { source_reference: " " },
    { address: 123 },
    { siren: "1234", verification_status: "verified", verification_evidence: "Evidence" },
    { verification_evidence: undefined },
    { unexpected: "ignored?" },
  ])
    assert.throws(() => validate(invalid), /Organisation/u);
  assert.throws(
    () => validateActors({ porteur: { type: "organisation", values, siret: "12345678901234" } }),
    /Organisation/u,
  );
});

const sourceSample = (typepersonne, projet = {}) => ({
  identity: { projetId: "7" },
  proposal: {
    porteur: { type: "organisation", values: {} },
    contacts: [{ sourceKey: "onagre-national:projet:7:applicant-contact", values: person }],
  },
  source: {
    rows: {
      projet: [
        { projetid: "8", petitionnairesid: "2", nomcoordinateur: "Other PERSON" },
        {
          projetid: "7",
          petitionnairesid: "1",
          prenompersonne: "Camille",
          nompersonne: "Exemple",
          qualificationpersonne: "M.",
          adressepetitionnaire: "1 rue des Lilas",
          telephonepetitionnaire: "0102030405",
          telephoneportablepetitionnaire: "",
          adressemailpetitionnaire: "",
          adressemailchefprojet: "",
          nomcoordinateur: "",
          ...projet,
        },
      ],
      petitionnaires: [{ petitionnairesid: "1", categorieid: "3" }],
      categorie: typepersonne === null ? [] : [{ categorieid: "3", typepersonne }],
    },
  },
});
const byInvolvement = (actors, involvement) =>
  (actors.people ?? actors.contacts).find((actor) => actor.involvement === involvement);

test("nomcoordinateur splits civility, uppercase last names and first names", () => {
  assert.deepEqual(splitCoordinateur("M. Ludovic BESSON"), {
    first_names: "Ludovic",
    last_name: "BESSON",
  });
  assert.deepEqual(splitCoordinateur("BEAU Laura"), { first_names: "Laura", last_name: "BEAU" });
  assert.deepEqual(splitCoordinateur("Madame Anne MARIE-CLAIRE"), {
    first_names: "Anne",
    last_name: "MARIE-CLAIRE",
  });
  assert.deepEqual(splitCoordinateur("Olivier Poisson"), {
    first_names: "Olivier",
    last_name: "Poisson",
  });
  assert.deepEqual(splitCoordinateur("JEAN DUPONT"), { first_names: "JEAN", last_name: "DUPONT" });
  assert.deepEqual(splitCoordinateur("Dupont"), { first_names: null, last_name: "Dupont" });
  for (const empty of ["", " ", "0", null, "Mme"]) assert.equal(splitCoordinateur(empty), null);
});

test("chef de projet email matches the person's name and first name or initial", () => {
  assert(emailMatchesPerson("camille.exemple@example.test", "Camille", "Exemple"));
  assert(emailMatchesPerson("cexemple@example.test", "Camille", "Exemple"));
  assert(emailMatchesPerson("exemple.c@example.test", "Camille", "Exemple"));
  assert(emailMatchesPerson("Éxemple@example.test", null, "Exemple"));
  assert(!emailMatchesPerson("dexemple@example.test", "Camille", "Exemple"));
  assert(!emailMatchesPerson("contact@example.test", "Camille", "Exemple"));
  assert(!emailMatchesPerson("contact.exemple@example.test", "Camille", "Exemple"));
  assert(!emailMatchesPerson("secretariat.exemple@example.test", "Sophie", "Exemple"));
});

test("the decision only replaces former applicant contacts", () => {
  const sample = sourceSample("Personne Morale");
  assertReplaceableContacts(sample);
  sample.proposal.contacts[0].sourceKey = "onagre-national:projet:7:other-contact";
  assert.throws(() => assertReplaceableContacts(sample), /former applicant/u);
  assertReplaceableContacts(sourceSample(null));
});

test("addresses are truncated to 255 characters and longer person fields are refused", () => {
  const long = `${"é".repeat(250)}  12345 6789`;
  assert.equal(truncateAddress(long), `${"é".repeat(250)}  123`.trimEnd());
  assert.equal([...truncateAddress(long)].length, 255);
  assert.equal(truncateAddress(`${"a".repeat(254)} b`), "a".repeat(254));
  assert.equal(truncateAddress(" 1 rue des Lilas "), "1 rue des Lilas");
  assert.equal(truncateAddress("0"), null);
  assert.throws(
    () =>
      validateActors({
        contacts: [{ ...contact, values: { ...person, last_name: "x".repeat(256) } }],
      }),
    /identity/u,
  );
  const sample = sourceSample("Personne Morale", { adressepetitionnaire: "a".repeat(300) });
  assert.equal(byInvolvement(sourceActors(sample), "beneficiaire").values.address, "a".repeat(255));
});

test("an unknown pétitionnaire category keeps the prepared porteur and contacts", () => {
  const sample = sourceSample(null);
  assert.equal(sourceActors(sample), null);
  assert.deepEqual(actorProposal(sample), {
    porteur: sample.proposal.porteur,
    contacts: sample.proposal.contacts,
  });
});

test("personne morale: prepared porteur, Bénéficiaire and coordinator contact", () => {
  const sample = sourceSample("Personne Morale", {
    prenompersonne: "",
    nompersonne: "0",
    adressemailchefprojet: "chef@example.test",
  });
  const actors = actorProposal(sample);
  assert.equal(actors.porteur, sample.proposal.porteur);
  assert(actors.legacyContacts);
  assert.deepEqual(byInvolvement(actors, "beneficiaire"), {
    sourceKey: "onagre-national:projet:7:beneficiaire",
    involvement: "beneficiaire",
    values: {
      ...person,
      first_names: null,
      last_name: "0",
      email: "chef@example.test",
      address: "1 rue des Lilas",
      phone: "0102030405",
    },
  });
  assert.equal(byInvolvement(actors, "personne_contact"), undefined);
  const withCoordinator = sourceActors(
    sourceSample("Personne Morale", {
      adressemailchefprojet: "chef@example.test",
      nomcoordinateur: "Mme Lou ROBIN",
    }),
  );
  assert.equal(byInvolvement(withCoordinator, "beneficiaire").values.email, null);
  assert.deepEqual(byInvolvement(withCoordinator, "personne_contact"), {
    sourceKey: "onagre-national:projet:7:coordinateur",
    involvement: "personne_contact",
    values: { ...person, first_names: "Lou", last_name: "ROBIN", email: "chef@example.test" },
  });
  const petitionnaire = sourceActors(
    sourceSample("Personne Morale", {
      adressemailpetitionnaire: " petitionnaire@example.test ",
      adressemailchefprojet: "chef@example.test",
    }),
  );
  assert.equal(
    byInvolvement(petitionnaire, "beneficiaire").values.email,
    "petitionnaire@example.test",
  );
  const nobody = sourceActors(
    sourceSample("Personne Morale", { prenompersonne: "", nompersonne: " " }),
  );
  assert.deepEqual(nobody.people, []);
});

test("personne physique: porteur without role, phones, matching chef email and contact", () => {
  const actors = actorProposal(
    sourceSample("Personne Physique", {
      telephoneportablepetitionnaire: "0607080910",
      adressemailchefprojet: "c.exemple@example.test",
      nomcoordinateur: "BEAU Laura",
    }),
  );
  assert.deepEqual(actors.porteur, {
    type: "personne_physique",
    values: {
      ...person,
      address: "1 rue des Lilas",
      phone: "0607080910",
      email: "c.exemple@example.test",
    },
  });
  assert.deepEqual(actors.contacts, [
    {
      sourceKey: "onagre-national:projet:7:coordinateur",
      involvement: "personne_contact",
      values: {
        ...person,
        first_names: "Laura",
        last_name: "BEAU",
        email: "c.exemple@example.test",
      },
    },
  ]);
  const other = sourceActors(
    sourceSample("Personne Physique", { adressemailchefprojet: "lou.robin@example.test" }),
  );
  assert.equal(other.porteur.values.email, null);
  assert.equal(other.porteur.values.phone, "0102030405");
  assert.deepEqual(other.people, []);
  const unnamed = sourceSample("Personne Physique", { prenompersonne: "0", nompersonne: "" });
  assert.equal(sourceActors(unnamed).porteur, unnamed.proposal.porteur);
});
