export type SearchableOption = { value: string; label: string };

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

export function filterSearchableOptions(
  options: SearchableOption[],
  query: string,
): SearchableOption[] {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return options;
  return options.filter(({ label }) => {
    const normalizedLabel = normalizeSearch(label);
    return terms.every((term) => normalizedLabel.includes(term));
  });
}
