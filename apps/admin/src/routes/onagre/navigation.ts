export function dumpLink(
  url: { searchParams: Pick<URLSearchParams, "get"> },
  changes: Record<string, string | number | null> = {},
) {
  const params = new URLSearchParams({ tab: "dump" });
  for (const key of [
    "snapshot",
    "table",
    "search",
    "column",
    "columns",
    "filters",
    "rowsPage",
    "row",
    "view",
  ]) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  return `?${params}`;
}

export function visibleColumns(params: Pick<URLSearchParams, "get">, columns: string[]): string[] {
  const raw = params.get("columns");
  if (raw === null) return columns;
  try {
    const selected: unknown = JSON.parse(raw);
    return Array.isArray(selected)
      ? columns.filter((column) => selected.includes(column))
      : columns;
  } catch {
    return columns;
  }
}
