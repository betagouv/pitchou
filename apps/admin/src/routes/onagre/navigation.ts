export function dumpLink(
  url: { searchParams: Pick<URLSearchParams, "get"> },
  changes: Record<string, string | number | null> = {},
) {
  const params = new URLSearchParams({ tab: "dump" });
  for (const key of ["snapshot", "table", "search", "column", "rowsPage", "row", "view"]) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  return `?${params}`;
}
