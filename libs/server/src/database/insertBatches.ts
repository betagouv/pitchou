/**
 * Bound inserts below PostgreSQL's 65,535 bind parameters. These rows contain plain
 * values, not raw SQL expressions with additional bindings.
 * Keep the original union of columns in every batch: Knex uses DEFAULT for missing
 * values, including during upserts. Splitting must not change which columns merge.
 */
export function* insertBatches<T extends object>(rows: T[]): Generator<T[]> {
  if (rows.length === 0) return;
  const columns = [...new Set(rows.flatMap(Object.keys))];
  const defaults = Object.fromEntries(columns.map((column) => [column, undefined]));
  const size = Math.max(1, Math.min(500, Math.floor(60_000 / columns.length)));
  for (let offset = 0; offset < rows.length; offset += size) {
    yield rows.slice(offset, offset + size).map((row) => ({ ...defaults, ...row }));
  }
}
