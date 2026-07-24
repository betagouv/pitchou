import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import {
  listEvenementsMetriques,
  type EvenementMetriqueSortKey,
  type EvenementMetriqueSortOrder,
} from "@pitchou/server/database/evenements_metriques.ts";

const SORT_KEYS: EvenementMetriqueSortKey[] = ["date", "evenement", "email"];

function parseSort(value: string | null): EvenementMetriqueSortKey {
  return SORT_KEYS.includes(value as EvenementMetriqueSortKey)
    ? (value as EvenementMetriqueSortKey)
    : "date";
}

function parseOrder(value: string | null): EvenementMetriqueSortOrder {
  return value === "asc" ? "asc" : "desc";
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async ({ url }) => {
  const params = url.searchParams;

  const { evenements, total } = await listEvenementsMetriques({
    page: Number(params.get("page")) || 1,
    pageSize: Number(params.get("pageSize")) || 50,
    evenement: params.get("evenement") ?? undefined,
    search: params.get("search") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    sort: parseSort(params.get("sort")),
    order: parseOrder(params.get("order")),
  });

  return json({ evenements, total });
};
