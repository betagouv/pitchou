import test from "node:test";
import assert from "node:assert/strict";
import { validateActors } from "./actors.mjs";
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
