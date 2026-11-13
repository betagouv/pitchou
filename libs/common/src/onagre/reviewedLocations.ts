import entries from "./reviewedLocations/entries.json" with { type: "json" };
import type { ReviewedLocationCorrection } from "@pitchou/types/onagreLocations.ts";

type LocationSnapshot = {
  key: string;
  projectId: string;
  reference: string;
  deposit: string | null;
  signatures: string[];
  departments: string[];
  sourceHash: string;
  sourceKind: "project" | "rows";
};

const sameValues = (left: string[], right: string[]) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export function hasReviewedLocation(key: string): boolean {
  return entries.some((entry) => entry.key === key);
}

/** A correction applies only to the exact reviewed snapshot, never to sibling demandes. */
export function reviewedLocation(input: LocationSnapshot): ReviewedLocationCorrection | null {
  const entry = entries.find((entry) => entry.key === input.key);
  if (
    !entry ||
    entry.projectId !== input.projectId ||
    entry.reference !== input.reference ||
    entry.deposit !== input.deposit ||
    entry.sourceHashes[input.sourceKind] !== input.sourceHash ||
    !sameValues(entry.signatures, input.signatures) ||
    !sameValues(entry.correction.originalDepartments, input.departments)
  )
    return null;
  return structuredClone(entry.correction);
}
