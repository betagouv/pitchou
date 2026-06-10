import type { Knex } from "knex";

// Relative import (not the `$` alias) so this module also resolves under `tsx`.
import { directDatabaseConnection } from "../../../scripts/server/database.ts";

import type { default as EspeceBdcStatut } from "../../../scripts/types/database/public/EspeceBdcStatut.ts";

export const BDC_STATUT_PAGE_SIZE = 20;

export type BdcStatutRow = Pick<
  EspeceBdcStatut,
  "id" | "cd_nom" | "cd_ref" | "cd_type_statut" | "label_statut"
> & { nom_scientifique: string | null };

export type BdcStatutSearch = {
  text: string;
  statut: string;
  sort: string;
  order: string;
  page: number;
};

export type BdcStatutPage = {
  rows: BdcStatutRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DIRECT_SEARCHABLE_COLUMNS = ["cd_nom", "cd_ref", "label_statut"];

// Sort key (the `tri` URL param) → column to order by, and whether it is a numeric code
// (so "10" sorts after "9").
const SORTS: Record<string, { column: string; numeric: boolean }> = {
  cdref: { column: "cd_ref", numeric: true },
  cdnom: { column: "cd_nom", numeric: true },
  typeStatut: { column: "cd_type_statut", numeric: false },
};
const DEFAULT_SORT = SORTS.cdref;

/** One page of BDC-Statuts rows matching the search and filter, with the total count. */
export async function searchBdcStatut(
  search: BdcStatutSearch,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<BdcStatutPage> {
  const total = await countRows(filteredBdcStatut(databaseConnection, search));
  const rows: BdcStatutRow[] = await orderedBdcStatut(
    filteredBdcStatut(databaseConnection, search),
    search,
  )
    .select(
      "id",
      "cd_nom",
      "cd_ref",
      "cd_type_statut",
      "label_statut",
      nomScientifiqueSubquery(databaseConnection),
    )
    .limit(BDC_STATUT_PAGE_SIZE)
    .offset((search.page - 1) * BDC_STATUT_PAGE_SIZE);
  return { rows, total, page: search.page, pageSize: BDC_STATUT_PAGE_SIZE };
}

/** Distinct, non-empty status types offered in the filter dropdown. */
export async function getBdcStatutFiltres(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ statuts: string[] }> {
  const rows = await databaseConnection("espece_bdc_statut")
    .distinct("cd_type_statut")
    .whereNot("cd_type_statut", "")
    .orderBy("cd_type_statut");
  return { statuts: rows.map((row) => row.cd_type_statut) };
}

/** A query narrowed to the active filter and text search, ready to count or page. */
function filteredBdcStatut(
  databaseConnection: Knex.Transaction | Knex,
  search: BdcStatutSearch,
): Knex.QueryBuilder {
  const query = databaseConnection("espece_bdc_statut");
  if (search.statut) query.where("cd_type_statut", search.statut);
  applyTextSearch(databaseConnection, query, search.text);
  return query;
}

/** Orders the query by the chosen sort, with `id` as a stable pagination tiebreaker. */
function orderedBdcStatut(query: Knex.QueryBuilder, search: BdcStatutSearch): Knex.QueryBuilder {
  const { column, numeric } = SORTS[search.sort] ?? DEFAULT_SORT;
  const direction = search.order === "desc" ? "desc" : "asc";
  if (numeric) query.orderByRaw(`nullif(${column}, '')::bigint ${direction}`);
  else query.orderBy(column, direction);
  return query.orderBy("id");
}

/**
 * Keeps rows where every search word appears (case-insensitively) in a code, the status
 * label, or the taxon's scientific name.
 */
function applyTextSearch(
  databaseConnection: Knex.Transaction | Knex,
  query: Knex.QueryBuilder,
  text: string,
): void {
  const words = text.trim().split(/\s+/).filter(Boolean);
  for (const word of words) {
    const pattern = `%${word}%`;
    query.where((builder) => {
      for (const column of DIRECT_SEARCHABLE_COLUMNS) builder.orWhereILike(column, pattern);
      builder.orWhereIn(
        "cd_nom",
        databaseConnection("espece_taxref").select("cd_nom").whereILike("lb_nom", pattern),
      );
    });
  }
}

/** Correlated subquery: the scientific name of the row's taxon, as `nom_scientifique`. */
function nomScientifiqueSubquery(databaseConnection: Knex.Transaction | Knex): Knex.QueryBuilder {
  return databaseConnection("espece_taxref")
    .select("lb_nom")
    .whereRaw("espece_taxref.cd_nom = espece_bdc_statut.cd_nom")
    .limit(1)
    .as("nom_scientifique");
}

/** Counts the rows matching a (filtered) query, without paging. */
async function countRows(query: Knex.QueryBuilder): Promise<number> {
  const row = await query.count<{ count: string }>({ count: "*" }).first();
  return Number(row?.count ?? 0);
}
