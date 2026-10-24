import type { Knex } from "knex";
import type { OnagreTable, SourceRow } from "@pitchou/types/onagre.ts";

export async function browseSourceRows(
  connection: Knex,
  snapshotId: number,
  tables: OnagreTable[],
  url: URL,
) {
  const table =
    tables.find((item) => item.name === url.searchParams.get("table")) ??
    tables.find((item) => item.name === "demandes") ??
    tables[0];
  if (!table) return null;
  const search = (url.searchParams.get("search") ?? "").slice(0, 200);
  const column = table.columns.find((name) => name === url.searchParams.get("column")) ?? "";
  const base = connection("onagre_source_row").where({
    snapshot_id: snapshotId,
    table_name: table.name,
  });
  const query = base.clone();
  if (search) {
    const pattern = `%${search.replaceAll(/[\\%_]/gu, "\\$&")}%`;
    if (column) query.whereRaw("content ->> ? ilike ?", [column, pattern]);
    else
      query.whereRaw(
        "exists (select 1 from jsonb_each_text(content) cell where cell.value ilike ?)",
        [pattern],
      );
  }
  const total = search ? Number((await query.clone().count("* as count"))[0].count) : table.count;
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(
    pages,
    Math.max(1, Math.floor(Number(url.searchParams.get("rowsPage")) || 1)),
  );
  const paginated = query.clone().select("row_number", "content").orderBy("row_number").limit(25);
  if (search) paginated.offset((page - 1) * 25);
  else paginated.where("row_number", ">", (page - 1) * 25);
  const rows: { row_number: number; content: SourceRow }[] = await paginated;
  const requested = Number(url.searchParams.get("row"));
  const selected: { row_number: number; content: SourceRow } | undefined =
    Number.isSafeInteger(requested) && requested > 0 && requested <= table.count
      ? await base.clone().where({ row_number: requested }).first("row_number", "content")
      : undefined;
  return {
    table: table.name,
    columns: table.columns,
    total,
    page,
    pages,
    search,
    column,
    rows,
    selected: selected ?? null,
  };
}
