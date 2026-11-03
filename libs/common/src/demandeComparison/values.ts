import type { ComparisonValue } from "@pitchou/types/demandeComparison.ts";

/** Object key order is immaterial; array order remains significant unless explicitly normalized. */
export function canonicalValue(value: ComparisonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function comparisonValue(value: unknown): ComparisonValue {
  if (value === undefined || value === null) return null;
  // Respect the date-only toJSON implementation used for SQL DATE columns.
  if (value instanceof Date) return value.toJSON();
  if (Array.isArray(value)) return value.map(comparisonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, comparisonValue(item)]),
    );
  }
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number")
    return value;
  throw new TypeError("Unsupported comparison value");
}

export function unorderedValues(value: unknown): ComparisonValue {
  const normalized = comparisonValue(value);
  return Array.isArray(normalized)
    ? normalized.toSorted((a, b) => canonicalValue(a).localeCompare(canonicalValue(b), "en"))
    : normalized;
}
