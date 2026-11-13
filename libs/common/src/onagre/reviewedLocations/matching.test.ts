import { expect, it } from "vitest";
import entries from "./entries.json" with { type: "json" };
import { reviewedLocation } from "../reviewedLocations.ts";

const entry = entries[0];
const snapshot = {
  key: entry.key,
  projectId: entry.projectId,
  reference: entry.reference,
  deposit: entry.deposit,
  signatures: entry.signatures,
  departments: entry.correction.originalDepartments,
  sourceHash: entry.sourceHashes.project,
  sourceKind: "project" as const,
};

it("corrects only the reviewed 20364 snapshot, preserving the original 99 departments", () => {
  const before = structuredClone(snapshot);
  const correction = reviewedLocation(snapshot)!;
  expect(correction.departments).toEqual([
    "16",
    "17",
    "19",
    "23",
    "24",
    "33",
    "40",
    "47",
    "64",
    "79",
    "86",
    "87",
  ]);
  expect(correction.originalDepartments).toHaveLength(99);
  expect(correction.evidence.articlePage).toBe(68);
  expect(snapshot).toEqual(before);
  correction.departments.push("75");
  expect(reviewedLocation(snapshot)!.departments).not.toContain("75");
  expect(
    reviewedLocation({ ...snapshot, sourceKind: "rows", sourceHash: entry.sourceHashes.rows }),
  ).not.toBeNull();
});

it.each([
  { key: "onagre-national:demandes:13125" },
  { projectId: "10213" },
  { reference: "2021-00124-011-001" },
  { deposit: "2024-12-19" },
  { signatures: ["2025-03-20"] },
  { signatures: ["2025-03-19", "2026-03-19"] },
  { departments: ["16"] },
  { sourceHash: "changed" },
  { sourceKind: "rows" as const },
])("does not apply to siblings or changed evidence: %j", (changes) => {
  expect(reviewedLocation({ ...snapshot, ...changes })).toBeNull();
});
