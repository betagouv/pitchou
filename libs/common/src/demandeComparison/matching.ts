import type { ComparisonRecord } from "@pitchou/types/demandeComparison.ts";
import { canonicalValue } from "./values.ts";

type Pair = [ComparisonRecord | undefined, ComparisonRecord | undefined];

function fingerprint(record: ComparisonRecord): string {
  const fields = record.fields
    .map(({ key, value, revisionKey }) => [key, canonicalValue(value), revisionKey])
    .sort();
  const sections = (record.sections ?? [])
    .map(({ key, records }) => [key, records.map(fingerprint).sort()])
    .sort();
  return JSON.stringify([record.key, fields, sections]);
}

/** Match identities, then equal contents, then unambiguous semantic counterparts. */
export function matchRecords(left: ComparisonRecord[], right: ComparisonRecord[]): Pair[] {
  const pairs: Pair[] = [];
  const remainingLeft = new Set(left.map((record) => ({ ...record })));
  const remainingRight = new Set(right.map((record) => ({ ...record })));
  const pair = (a: ComparisonRecord, b: ComparisonRecord) => {
    pairs.push([a, b]);
    remainingLeft.delete(a);
    remainingRight.delete(b);
  };
  for (const a of remainingLeft) {
    if (!a.identity) continue;
    const candidates = [...remainingRight].filter((b) => b.identity === a.identity);
    if (candidates.length === 1) pair(a, candidates[0]);
  }
  const rightByContent = new Map<string, ComparisonRecord[]>();
  for (const b of remainingRight) {
    const key = fingerprint(b);
    rightByContent.set(key, [...(rightByContent.get(key) ?? []), b]);
  }
  for (const a of remainingLeft) {
    const b = rightByContent.get(fingerprint(a))?.shift();
    if (b) pair(a, b);
  }
  for (const a of remainingLeft) {
    const before = [...remainingLeft].filter((item) => item.key === a.key);
    const after = [...remainingRight].filter((item) => item.key === a.key);
    // Duplicates are real records. Do not invent a correspondence or discard multiplicity.
    if (before.length === 1 && after.length === 1) pair(a, after[0]);
  }
  for (const a of remainingLeft) pairs.push([a, undefined]);
  for (const b of remainingRight) pairs.push([undefined, b]);
  return pairs;
}
