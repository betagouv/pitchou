import type { MappingStatus, OnagreMapping } from "@pitchou/types/onagre.ts";

export type Target = { table_name: string; column_name: string; data_type: string };
export const statusLabels: Record<MappingStatus, string> = {
  todo: "À traiter",
  review: "À valider",
  discuss: "À discuter",
  validated: "Validée",
  excluded: "Exclue",
};
export const statusHints: Record<MappingStatus, string> = {
  todo: "La correspondance reste à préparer.",
  review:
    "Un brouillon est proposé. Relisez la destination, la règle et les notes avant de valider.",
  discuss: "Une question doit être tranchée avec l'équipe.",
  validated: "La destination et la règle sont décidées. Elles seront à implémenter.",
  excluded: "Cette information ne sera pas reprise. Expliquez pourquoi ci-dessous.",
};
export const isComplete = (mapping: OnagreMapping) =>
  mapping.status === "validated" || mapping.status === "excluded";
export function compareMappings(left: OnagreMapping, right: OnagreMapping): number {
  const section = left.section.localeCompare(right.section, "fr");
  if (section) return section;
  const leftKey = left.relations?.primaryKey ?? [];
  const rightKey = right.relations?.primaryKey ?? [];
  const priority = Number(rightKey.length > 0) - Number(leftKey.length > 0);
  if (priority) return priority;
  if (leftKey.length > 0 && rightKey.length > 0) {
    const position = leftKey.indexOf(left.label) - rightKey.indexOf(right.label);
    if (position) return position;
  }
  return left.key.localeCompare(right.key, "fr", { numeric: true });
}
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .trim();

export function mappingLink(
  url: { searchParams: Pick<URLSearchParams, "get"> },
  changes: Record<string, string | null>,
) {
  const params = new URLSearchParams({ tab: "correspondances" });
  for (const key of [
    "snapshot",
    "mappingTable",
    "mappingSearch",
    "mappingStatus",
    "mappingKind",
    "mappingPage",
    "mapping",
  ]) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return `?${params}`;
}
