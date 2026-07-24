import { AccessDeniedError } from "./adminEspeces.ts";

export { AccessDeniedError };

export type EvenementMetriqueRow = {
  id: string;
  email: string | null;
  date: string;
  evenement: string;
  details: unknown | null;
};

export type EvenementSortKey = "date" | "evenement" | "email";
export type EvenementSortOrder = "asc" | "desc";

export type EvenementsQuery = {
  search: string;
  /** Exact event type, or "" for every type. */
  evenement: string;
  /** YYYY-MM-DD, or "" for no bound. */
  dateFrom: string;
  dateTo: string;
  sort: EvenementSortKey;
  order: EvenementSortOrder;
  page: number;
  pageSize: number;
};

export type EvenementsPage = {
  evenements: EvenementMetriqueRow[];
  total: number;
};

export function defaultEvenementsQuery(): EvenementsQuery {
  return {
    search: "",
    evenement: "",
    dateFrom: "",
    dateTo: "",
    sort: "date",
    order: "desc",
    page: 1,
    pageSize: 50,
  };
}

/**
 * Loads one server-side-filtered page of tracked events. Throws
 * {@link AccessDeniedError} on 403.
 */
export async function loadEvenements(query: EvenementsQuery): Promise<EvenementsPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
    order: query.order,
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.evenement) params.set("evenement", query.evenement);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);

  const response = await fetch(`/api/evenements?${params.toString()}`);

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors du chargement des évènements : ${response.statusText}`,
    );
  }

  const page = await response.json();
  if (!page || !Array.isArray(page.evenements) || typeof page.total !== "number") {
    throw new Error("Réponse invalide reçue du serveur pour les évènements.");
  }

  return page as EvenementsPage;
}

/** Loads the distinct event types for the filter dropdown. */
export async function loadEvenementTypes(): Promise<string[]> {
  const response = await fetch(`/api/evenements/types`);

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors du chargement des types d'évènements : ${response.statusText}`,
    );
  }

  const types = await response.json();
  if (!Array.isArray(types)) {
    throw new Error("Réponse invalide reçue du serveur pour les types d'évènements.");
  }

  return types;
}
