import type { DossiersPage, DossiersQuery } from "./adminDossierTypes.ts";
import { checkResponse } from "./adminResponse.ts";

export function defaultDossiersQuery(): DossiersQuery {
  return {
    search: "",
    phase: "",
    source: "",
    sort: "depot_date",
    order: "desc",
    page: 1,
    pageSize: 50,
  };
}

export async function loadDossiers(query: DossiersQuery): Promise<DossiersPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.phase) params.set("phase", query.phase);
  if (query.source) params.set("source", query.source);
  params.set("sort", query.sort);
  params.set("order", query.order);
  const response = await fetch(`/api/dossiers?${params.toString()}`);
  await checkResponse(response, "du chargement des dossiers");
  const page = await response.json();
  if (!page || !Array.isArray(page.dossiers) || typeof page.total !== "number") {
    throw new Error("Réponse invalide reçue du serveur pour les dossiers.");
  }
  return page as DossiersPage;
}

export async function downloadDossiersCSV(year: number): Promise<void> {
  const response = await fetch(`/api/dossiers/export-csv?year=${year}`);
  await checkResponse(response, "du téléchargement des dossiers");

  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `dossiers_${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
