import { expect, it } from "vitest";
import entries from "@pitchou/common/onagre/reviewedLocations/entries.json" with { type: "json" };
import type { DuplicateReview } from "@pitchou/types/onagreDuplicates.ts";
import { withReviewedLocations } from "./locations.ts";

it("preserves review hashes, decisions, DN candidates and sibling locations", () => {
  const entry = entries[0];
  const demande = {
    key: entry.key,
    id: "20364",
    reference: entry.reference,
    deposit: entry.deposit,
    signatures: entry.signatures,
    departments: entry.correction.originalDepartments,
    communes: [],
    linkedDossierId: null,
    linkReason: "",
    question: "Review the duplicate",
  };
  const original: DuplicateReview = {
    project_id: "10212",
    review_hash: "unchanged-review-hash",
    payload: {
      projectId: "10212",
      sourceHash: entry.sourceHashes.project,
      name: "PRAM",
      reason: "Duplicate still unresolved",
      question: "Choose a target",
      omittedDemandeIds: [],
      demandes: [
        demande,
        { ...demande, key: "onagre-national:demandes:13125", id: "13125", departments: ["16"] },
      ],
      candidates: [
        {
          ...demande,
          id: 1055159,
          name: "Existing DN",
          relationship: "candidate",
          departments: ["16"],
        },
      ],
    },
  };
  const before = structuredClone(original);
  const result = withReviewedLocations(original);
  expect(original).toEqual(before);
  expect(result.review_hash).toBe(original.review_hash);
  expect(result.payload.demandes[0].departments).toHaveLength(12);
  expect(result.payload.demandes[0].locationCorrection?.originalDepartments).toHaveLength(99);
  expect(result.payload.demandes[0].linkedDossierId).toBeNull();
  expect(result.payload.demandes[1]).toEqual(original.payload.demandes[1]);
  expect(result.payload.candidates).toEqual(original.payload.candidates);
  expect(result.payload.reason).toBe(original.payload.reason);
  expect(
    withReviewedLocations({ ...original, payload: { ...original.payload, sourceHash: "changed" } }),
  ).toEqual({ ...original, payload: { ...original.payload, sourceHash: "changed" } });
});
