import { expect, test } from "vitest";

import { isValidDate, isValidIdParam, validateChangelogPayload } from "./validation.ts";

const validPayload = {
  version_major: 1,
  version_minor: 4,
  version_patch: 0,
  date: "2026-08-19",
  titre: "Nouvelle version",
  contenu: "<p>Détails</p>",
  published: true,
};

test("accepts a complete payload", () => {
  const result = validateChangelogPayload(validPayload);
  expect(result).toEqual({ ok: true, value: validPayload });
});

test("rejects non-objects", () => {
  for (const payload of [null, undefined, "texte", 42, [validPayload]]) {
    expect(validateChangelogPayload(payload).ok).toBe(false);
  }
});

test("rejects unknown properties", () => {
  const result = validateChangelogPayload({ ...validPayload, updated_by: "attacker@example.org" });
  expect(result).toEqual({ ok: false, message: "Propriété non reconnue : 'updated_by'." });
});

test("version segments must be integers 0-9999 or null, and all present", () => {
  const { version_minor, ...withoutSegment } = validPayload;
  void version_minor;
  expect(validateChangelogPayload(withoutSegment).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, version_major: "1" }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, version_major: 1.5 }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, version_major: -1 }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, version_major: 10_000 }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, version_major: 0 }).ok).toBe(true);
});

test("half-typed versions save as drafts but cannot be published", () => {
  const halfTyped = { ...validPayload, version_minor: null, version_patch: null };
  expect(validateChangelogPayload({ ...halfTyped, published: false }).ok).toBe(true);
  expect(validateChangelogPayload(halfTyped).ok).toBe(false);
});

test("published entries require a titre and a complete version", () => {
  expect(validateChangelogPayload({ ...validPayload, version_patch: null }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, titre: "  " }).ok).toBe(false);
  expect(
    validateChangelogPayload({
      ...validPayload,
      version_major: null,
      version_minor: null,
      version_patch: null,
      titre: "",
      published: false,
    }).ok,
  ).toBe(true);
});

test("rejects a missing or malformed date", () => {
  const { date, ...withoutDate } = validPayload;
  void date;
  expect(validateChangelogPayload(withoutDate).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, date: "19/08/2026" }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, date: "2026-02-29" }).ok).toBe(false);
});

test("rejects a missing, non-string or oversized titre (empty is fine on drafts)", () => {
  const { titre, ...withoutTitre } = validPayload;
  void titre;
  expect(validateChangelogPayload(withoutTitre).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, titre: 12 }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, titre: "", published: false }).ok).toBe(true);
  expect(validateChangelogPayload({ ...validPayload, titre: "x".repeat(201) }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, titre: "x".repeat(200) }).ok).toBe(true);
});

test("rejects a non-string or oversized contenu", () => {
  expect(validateChangelogPayload({ ...validPayload, contenu: 12 }).ok).toBe(false);
  expect(validateChangelogPayload({ ...validPayload, contenu: "x".repeat(100_001) }).ok).toBe(
    false,
  );
  expect(validateChangelogPayload({ ...validPayload, contenu: "" }).ok).toBe(true);
});

test("rejects a non-boolean published", () => {
  expect(validateChangelogPayload({ ...validPayload, published: "true" }).ok).toBe(false);
});

test("isValidDate accepts real calendar dates only", () => {
  expect(isValidDate("2026-08-19")).toBe(true);
  expect(isValidDate("2024-02-29")).toBe(true); // leap year
  expect(isValidDate("2026-02-29")).toBe(false); // not a leap year
  expect(isValidDate("2026-13-01")).toBe(false);
  expect(isValidDate("2026-00-10")).toBe(false);
  expect(isValidDate("2026-8-19")).toBe(false);
  expect(isValidDate("19-08-2026")).toBe(false);
  expect(isValidDate("2026-08-19T00:00:00Z")).toBe(false);
  expect(isValidDate("")).toBe(false);
});

test("isValidIdParam accepts positive integers only", () => {
  expect(isValidIdParam("1")).toBe(true);
  expect(isValidIdParam("42")).toBe(true);
  expect(isValidIdParam("0")).toBe(false);
  expect(isValidIdParam("-3")).toBe(false);
  expect(isValidIdParam("3.5")).toBe(false);
  expect(isValidIdParam("abc")).toBe(false);
  expect(isValidIdParam("12abc")).toBe(false);
  expect(isValidIdParam("")).toBe(false);
  expect(isValidIdParam("9007199254740993")).toBe(false); // beyond safe integers
});
