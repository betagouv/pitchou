// Client-side counterpart of `$lib/server/bdcStatut.ts`: the row/page shapes returned
// by the API, plus helpers to read the search state from the URL and fetch one page.
// BDC-Statuts has one row per species × status, far too many to load at once, so every
// search, filter change and page turn is a request that returns only the matching slice.

export const BDC_STATUT_PAGE_SIZE = 20;

export type BdcStatutRow = {
  id: string;
  cd_nom: string;
  cd_ref: string;
  cd_type_statut: string;
  label_statut: string;
  nom_scientifique: string | null;
  nom_vernaculaire: string | null;
};

export type BdcStatutPage = {
  rows: BdcStatutRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type BdcStatutFiltres = {
  statuts: string[];
};

export type SortKey = "cdref" | "cdnom" | "typeStatut";
export type SortOrder = "asc" | "desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "cdref", label: "CD_REF" },
  { key: "cdnom", label: "CD_NOM" },
  { key: "typeStatut", label: "Type de statut" },
];

const SORT_KEYS: readonly string[] = SORT_OPTIONS.map((option) => option.key);

/** Search/filter/sort/page state, parsed from (and serialized back to) the URL. */
export type BdcStatutQuery = {
  searchText: string;
  statut: string;
  sort: SortKey;
  order: SortOrder;
  page: number;
};

/** Reads the query state from URL params, defaulting missing or invalid values. */
export function parseBdcStatutQuery(params: URLSearchParams): BdcStatutQuery {
  const sort = params.get("tri") ?? "";
  const page = Number(params.get("page"));
  return {
    searchText: params.get("q") ?? "",
    statut: params.get("statut") ?? "",
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : "cdref",
    order: params.get("ordre") === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Fetches one page of results for the given query. */
export async function fetchBdcStatutPage(
  query: BdcStatutQuery,
  fetchFn: typeof fetch = fetch,
): Promise<BdcStatutPage> {
  const réponse = await fetchFn(`/api/bdc-statuts${apiQueryString(query)}`);
  if (!réponse.ok) throw new Error(`Échec du chargement de BDC-Statuts (${réponse.status})`);
  return réponse.json();
}

/** Fetches the distinct status types that populate the filter. */
export async function fetchBdcStatutFiltres(
  fetchFn: typeof fetch = fetch,
): Promise<BdcStatutFiltres> {
  const réponse = await fetchFn("/api/bdc-statuts/filtres");
  if (!réponse.ok)
    throw new Error(`Échec du chargement des filtres BDC-Statuts (${réponse.status})`);
  return réponse.json();
}

/** The API query string for a search state (same param names as the page URL). */
function apiQueryString(query: BdcStatutQuery): string {
  const params = new URLSearchParams();
  if (query.searchText) params.set("q", query.searchText);
  if (query.statut) params.set("statut", query.statut);
  if (query.sort !== "cdref") params.set("tri", query.sort);
  if (query.order === "desc") params.set("ordre", query.order);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
