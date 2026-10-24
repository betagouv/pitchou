import { describe, expect, it } from "vitest";
import { parseBundle, parseDecision } from "./validation.ts";
import { recordFingerprint } from "./snapshots.ts";
const bundle = () => ({
  format: "pitchou-onagre-v1",
  fingerprint: "a".repeat(64),
  workbookFingerprint: "b".repeat(64),
  filename: "backup",
  tables: [
    { name: "demandes", columns: ["demandesid", "projetid"], count: 1, samples: [] },
    { name: "projet", columns: ["projetid"], count: 1, samples: [] },
  ],
  mappings: [],
  demandes: [{ demandesid: "1", projetid: "2" }],
  projets: [{ projetid: "2" }],
});
describe("Onagre package", () => {
  it("accepts a coherent package", () => {
    expect(parseBundle(bundle()).demandes).toHaveLength(1);
  });
  it("rejects duplicate source IDs and broken project references", () => {
    const duplicate = bundle();
    duplicate.demandes.push(duplicate.demandes[0]);
    expect(() => parseBundle(duplicate)).toThrow();
    const orphan = bundle();
    orphan.demandes[0].projetid = "3";
    expect(() => parseBundle(orphan)).toThrow();
    const badCount = bundle();
    badCount.tables[0].count = 3;
    expect(() => parseBundle(badCount)).toThrow();
  });
  it("ignores key order when comparing records, and notices project changes", () => {
    expect(recordFingerprint({ id: "1", name: "a" }, {})).toBe(
      recordFingerprint({ name: "a", id: "1" }, {}),
    );
    expect(recordFingerprint({ id: "1" }, { name: "a" })).not.toBe(
      recordFingerprint({ id: "1" }, { name: "b" }),
    );
  });
});
it("requires explicit rules for validation or exclusion", () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    key: "field:projet.nomprojet",
    version: "1",
    status: "validated",
    target: "dossier.name",
    rule: "",
    notes: "",
  }))
    form.set(key, value);
  expect(() => parseDecision(form)).toThrow();
  form.set("rule", "Copier le titre.");
  expect(parseDecision(form).status).toBe("validated");
  form.set("status", "excluded");
  form.set("rule", "");
  expect(() => parseDecision(form)).toThrow();
  form.set("status", "review");
  expect(parseDecision(form).status).toBe("review");
  form.set("status", "not-a-status");
  expect(() => parseDecision(form)).toThrow("Décision invalide");
});

it("rejects a package that tries to seed already validated decisions", () => {
  const input = {
    ...bundle(),
    mappings: [
      {
        key: "field:projet.projetid",
        section: "projet",
        label: "projetid",
        context: "",
        proposal: "",
        confidence: "",
        notes: "",
        status: "validated",
      },
    ],
  };
  expect(() => parseBundle(input)).toThrow();
});
