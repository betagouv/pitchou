import type { DossiersPage, DossiersQuery } from "./adminDossierTypes.ts";
import { checkResponse } from "./adminResponse.ts";

export function defaultDossiersQuery(): DossiersQuery {
  return { search: "", phase: "", source: "", page: 1, pageSize: 50 };
}

export async function loadDossiers(query: DossiersQuery): Promise<DossiersPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.phase) params.set("phase", query.phase);
  if (query.source) params.set("source", query.source);
  const response = await fetch(`/api/dossiers?${params.toString()}`);
  await checkResponse(response, "du chargement des dossiers");
  const page = await response.json();
  if (!page || !Array.isArray(page.dossiers) || typeof page.total !== "number") {
    throw new Error("Réponse invalide reçue du serveur pour les dossiers.");
  }
  return page as DossiersPage;
}
