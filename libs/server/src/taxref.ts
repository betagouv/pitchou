import type { Knex } from "knex";

// Relative import (not the `$` alias) so this module also resolves under `tsx`.
import { directDatabaseConnection } from "./database.ts";

import type { default as EspeceTaxref } from "@pitchou/types/database/public/EspeceTaxref.ts";

export const TAXREF_PAGE_SIZE = 20;

export type TaxrefRow = Pick<
  EspeceTaxref,
  "id" | "cd_nom" | "cd_ref" | "lb_nom" | "nom_vern" | "regne" | "classe"
>;

export type TaxrefSearch = {
  text: string;
  regne: string;
  classe: string;
  sort: string;
  order: string;
  page: number;
};

export type TaxrefPage = {
  rows: TaxrefRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DISPLAYED_COLUMNS = ["id", "cd_nom", "cd_ref", "lb_nom", "nom_vern", "regne", "classe"];
const SEARCHABLE_COLUMNS = ["cd_nom", "cd_ref", "lb_nom", "nom_vern"];

// Sort key (the `tri` URL param) → column to order by, and whether it is a numeric code
// (so "10" sorts after "9").
const SORTS: Record<string, { column: string; numeric: boolean }> = {
  nomScientifique: { column: "lb_nom", numeric: false },
  nomVernaculaire: { column: "nom_vern", numeric: false },
  cdnom: { column: "cd_nom", numeric: true },
  cdref: { column: "cd_ref", numeric: true },
};
const DEFAULT_SORT = SORTS.nomScientifique;

/** One page of TAXREF rows matching the search and filters, with the total count. */
export async function searchTaxref(
  search: TaxrefSearch,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<TaxrefPage> {
  const total = await countRows(filteredTaxref(databaseConnection, search));
  const rows = await orderedTaxref(filteredTaxref(databaseConnection, search), search)
    .select(DISPLAYED_COLUMNS)
    .limit(TAXREF_PAGE_SIZE)
    .offset((search.page - 1) * TAXREF_PAGE_SIZE);
  return { rows, total, page: search.page, pageSize: TAXREF_PAGE_SIZE };
}

/** Distinct, non-empty values offered in the règne / classe filter dropdowns. */
export async function getTaxrefFiltres(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ regnes: string[]; classes: string[] }> {
  const [regnes, classes] = await Promise.all([
    distinctValues(databaseConnection, "regne"),
    distinctValues(databaseConnection, "classe"),
  ]);
  return { regnes, classes };
}

/** A query narrowed to the active filters and text search, ready to count or page. */
function filteredTaxref(
  databaseConnection: Knex.Transaction | Knex,
  search: TaxrefSearch,
): Knex.QueryBuilder {
  const query = databaseConnection("espece_taxref");
  if (search.regne) query.where("regne", search.regne);
  if (search.classe) query.where("classe", search.classe);
  applyTextSearch(query, search.text);
  return query;
}

/** Orders the query by the chosen sort, with `id` as a stable pagination tiebreaker. */
function orderedTaxref(query: Knex.QueryBuilder, search: TaxrefSearch): Knex.QueryBuilder {
  const { column, numeric } = SORTS[search.sort] ?? DEFAULT_SORT;
  const direction = search.order === "desc" ? "desc" : "asc";
  if (numeric) query.orderByRaw(`nullif(${column}, '')::bigint ${direction}`);
  else query.orderBy(column, direction);
  return query.orderBy("id");
}

/** Keeps rows where every search word appears (case-insensitively) in some column. */
function applyTextSearch(query: Knex.QueryBuilder, text: string): void {
  const words = text.trim().split(/\s+/).filter(Boolean);
  for (const word of words) {
    const pattern = `%${word}%`;
    query.where((builder) => {
      for (const column of SEARCHABLE_COLUMNS) builder.orWhereILike(column, pattern);
    });
  }
}

/** Counts the rows matching a (filtered) query, without paging. */
async function countRows(query: Knex.QueryBuilder): Promise<number> {
  const row = await query.count<{ count: string }>({ count: "*" }).first();
  return Number(row?.count ?? 0);
}

/** Sorted, non-empty distinct values of a column, for a filter dropdown. */
async function distinctValues(
  databaseConnection: Knex.Transaction | Knex,
  column: string,
): Promise<string[]> {
  const rows = await databaseConnection("espece_taxref")
    .distinct(column)
    .whereNot(column, "")
    .orderBy(column);
  return rows.map((row) => row[column]);
}
