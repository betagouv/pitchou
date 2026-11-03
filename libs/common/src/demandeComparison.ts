import type {
  ComparisonRecord,
  ComparisonSection,
  ComparisonValue,
  DemandeComparisonDocument,
  DemandeDifference,
} from "@pitchou/types/demandeComparison.ts";
import { matchRecords } from "./demandeComparison/matching.ts";
import { canonicalValue } from "./demandeComparison/values.ts";

export { buildDemandeComparison } from "./demandeComparison/projection.ts";

/** Compares authorized domain data, without treating capture metadata as dossier changes. */
export function compareDemandes(
  left: DemandeComparisonDocument,
  right: DemandeComparisonDocument,
): DemandeDifference[] {
  return compareSections(left.sections, right.sections, []);
}

function compareSections(
  left: ComparisonSection[],
  right: ComparisonSection[],
  path: string[],
): DemandeDifference[] {
  const keys = new Set([...left, ...right].map((section) => section.key));
  return [...keys].flatMap((key) => {
    const before = left.find((section) => section.key === key);
    const after = right.find((section) => section.key === key);
    const sectionPath = [...path, (after ?? before)!.label];
    return matchRecords(before?.records ?? [], after?.records ?? []).flatMap(([a, b]) => {
      const recordPath = [...sectionPath, (b ?? a)!.label];
      if (!a || !b) {
        return [
          {
            path: recordPath,
            kind: a ? ("removed" as const) : ("added" as const),
            left: a ? describeRecord(a) : null,
            right: b ? describeRecord(b) : null,
          },
        ];
      }
      return compareRecords(a, b, recordPath);
    });
  });
}

function compareRecords(
  left: ComparisonRecord,
  right: ComparisonRecord,
  path: string[],
): DemandeDifference[] {
  const keys = new Set([...left.fields, ...right.fields].map((field) => field.key));
  const differences: DemandeDifference[] = [];
  for (const key of keys) {
    const before = left.fields.find((field) => field.key === key);
    const after = right.fields.find((field) => field.key === key);
    const a = before?.value ?? null;
    const b = after?.value ?? null;
    const sameValue = canonicalValue(a) === canonicalValue(b);
    if (!sameValue || before?.revisionKey !== after?.revisionKey) {
      differences.push({
        path: [...path, (after ?? before)!.label],
        kind: a === null ? "added" : b === null ? "removed" : "changed",
        left: a,
        right: b,
        ...(sameValue ? { detail: "Le document associé a changé." } : {}),
      });
    }
  }
  return [...differences, ...compareSections(left.sections ?? [], right.sections ?? [], path)];
}

function describeRecord(record: ComparisonRecord): ComparisonValue {
  return {
    ...Object.fromEntries(record.fields.map((field) => [field.label, field.value])),
    ...Object.fromEntries(
      (record.sections ?? []).map((section) => [
        section.label,
        section.records.map(describeRecord),
      ]),
    ),
  };
}
