import type { ComparisonField, ComparisonRecord } from "@pitchou/types/demandeComparison.ts";
import type { FrontEndFichier } from "@pitchou/types/API_Pitchou.ts";
import { comparisonValue, unorderedValues } from "./values.ts";

const unordered = new Set([
  "communes",
  "departments",
  "regions",
  "ae_procedures",
  "scientifique_demande_type",
  "scientifique_capture_mode",
  "scientifique_demande_purposes",
  "scientifique_intervenants",
  "eolien_mortality_actions",
  "involvements",
]);

export function fields<T extends object>(
  source: T,
  labels: Partial<Record<keyof T, string>>,
): ComparisonField[] {
  return (Object.entries(labels) as [keyof T & string, string][]).map(([key, label]) => ({
    key,
    label,
    value: unordered.has(key)
      ? unorderedValues(source[key])
      : comparisonValue(normalizeDate(key, source[key])),
  }));
}

function normalizeDate(key: string, value: unknown) {
  if (
    typeof value === "string" &&
    /(?:_date|_at|timestamp)$/u.test(key) &&
    /^\d{4}-\d{2}-\d{2}T/u.test(value)
  ) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return value;
}

export function record<T extends object>(
  key: string,
  label: string,
  source: T,
  labels: Partial<Record<keyof T, string>>,
  identity?: string,
): ComparisonRecord {
  return { key, label, identity, fields: fields(source, labels) };
}

export function fileField(
  key: string,
  label: string,
  file: FrontEndFichier | undefined,
  url?: string,
): ComparisonField {
  const reference =
    file?.id ?? (file?.url ?? url)?.match(/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/iu)?.[0];
  return {
    key,
    label,
    value: file?.name ?? (url ? "Document joint" : null),
    revisionKey: reference,
  };
}
