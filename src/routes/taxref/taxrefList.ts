// Client-side counterpart of `$lib/server/taxref.ts`: the row/page shapes returned by
// the API, plus helpers to read the search state from the URL and fetch one page. The
// whole TAXREF referential is far too large to load at once, so every search, filter
// change and page turn is a request that returns only the matching slice.

export const TAXREF_PAGE_SIZE = 20;

export type TaxrefRow = {
  id: string;
  cd_nom: string;
  cd_ref: string;
  lb_nom: string;
  nom_vern: string;
  regne: string;
  classe: string;
};

export type TaxrefPage = {
  rows: TaxrefRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type TaxrefFiltres = {
  regnes: string[];
  classes: string[];
};

export type SortKey = "nomScientifique" | "nomVernaculaire" | "cdnom" | "cdref";
export type SortOrder = "asc" | "desc";

/**
 * REGNE/CLASSE → espece protegee classification, or `null` when the taxon cannot be
 * classified. Mirrors the deduction done at import time (`especeProtegeeReference.ts`).
 */
export function classificationFromTaxref(regne: string, classe: string): string | null {
  if (["Plantae", "Fungi", "Chromista"].includes(regne)) return "flore";
  if (regne === "Animalia" && classe === "Aves") return "oiseau";
  if (regne === "Animalia") return "faune non-oiseau";
  return null;
}

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "nomScientifique", label: "Nom scientifique" },
  { key: "nomVernaculaire", label: "Nom vernaculaire" },
  { key: "cdnom", label: "CD_NOM" },
  { key: "cdref", label: "CD_REF" },
];

const SORT_KEYS: readonly string[] = SORT_OPTIONS.map((option) => option.key);

/** Search/filter/sort/page state, parsed from (and serialized back to) the URL. */
export type TaxrefQuery = {
  searchText: string;
  regne: string;
  classe: string;
  sort: SortKey;
  order: SortOrder;
  page: number;
};

/** Reads the query state from URL params, defaulting missing or invalid values. */
export function parseTaxrefQuery(params: URLSearchParams): TaxrefQuery {
  const sort = params.get("tri") ?? "";
  const page = Number(params.get("page"));
  return {
    searchText: params.get("q") ?? "",
    regne: params.get("regne") ?? "",
    classe: params.get("classe") ?? "",
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : "nomScientifique",
    order: params.get("ordre") === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Fetches one page of results for the given query. */
export async function fetchTaxrefPage(
  query: TaxrefQuery,
  fetchFn: typeof fetch = fetch,
): Promise<TaxrefPage> {
  const réponse = await fetchFn(`/api/taxref${apiQueryString(query)}`);
  if (!réponse.ok) throw new Error(`Échec du chargement de TAXREF (${réponse.status})`);
  return réponse.json();
}

/** Fetches the distinct values that populate the règne / classe filters. */
export async function fetchTaxrefFiltres(fetchFn: typeof fetch = fetch): Promise<TaxrefFiltres> {
  const réponse = await fetchFn("/api/taxref/filtres");
  if (!réponse.ok) throw new Error(`Échec du chargement des filtres TAXREF (${réponse.status})`);
  return réponse.json();
}

/** The API query string for a search state (same param names as the page URL). */
function apiQueryString(query: TaxrefQuery): string {
  const params = new URLSearchParams();
  if (query.searchText) params.set("q", query.searchText);
  if (query.regne) params.set("regne", query.regne);
  if (query.classe) params.set("classe", query.classe);
  if (query.sort !== "nomScientifique") params.set("tri", query.sort);
  if (query.order === "desc") params.set("ordre", query.order);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
