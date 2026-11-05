import { expect, test } from "vitest";
import { isOrganisation } from "./organisation.ts";

const declared = {
  type: "organisation",
  name: "Commune de Tours",
  address: null,
  siren: null,
  verification_status: "source_declared",
  source: "onagre",
  source_reference: "acteur-42",
  verification_evidence: null,
};

test("a source declaration needs provenance and cannot claim a SIREN or verification evidence", () => {
  expect(isOrganisation(declared)).toBe(true);
  expect(isOrganisation({ ...declared, siren: "123456789" })).toBe(false);
  expect(isOrganisation({ ...declared, verification_evidence: "Import record" })).toBe(false);
});

test("verification requires evidence and only accepts an optional nine digit SIREN", () => {
  const verified = { ...declared, verification_status: "verified" };
  expect(isOrganisation(verified)).toBe(false);
  const withEvidence = { ...verified, verification_evidence: "Registry extract 2026-11-04" };
  expect(isOrganisation(withEvidence)).toBe(true);
  expect(isOrganisation({ ...withEvidence, siren: "123456789" })).toBe(true);
  for (const siren of [123456789, "12345678", "1234567890", "123 456 789", "abcdefghi"]) {
    expect(isOrganisation({ ...withEvidence, siren })).toBe(false);
  }
  expect(isOrganisation({ ...withEvidence, verification_evidence: " \t\n" })).toBe(false);
});

test("required fields are explicit and nonblank, while address may be null", () => {
  for (const key of ["name", "source", "source_reference"]) {
    expect(isOrganisation({ ...declared, [key]: " \t\n" })).toBe(false);
    expect(isOrganisation({ ...declared, [key]: undefined })).toBe(false);
  }
  for (const value of [null, undefined, [], {}, { ...declared, type: "personne_morale" }]) {
    expect(isOrganisation(value)).toBe(false);
  }
  expect(isOrganisation({ ...declared, address: 42 })).toBe(false);
  expect(isOrganisation({ ...declared, address: undefined })).toBe(false);
  expect(isOrganisation({ ...declared, address: "1 rue de la Mairie" })).toBe(true);
});
