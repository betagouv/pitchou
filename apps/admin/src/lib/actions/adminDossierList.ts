import type { DossiersPage, DossiersQuery } from "./adminDossierTypes.ts";
import { AccessDeniedError } from "./adminEspeces.ts";

async function checkResponse(response: Response): Promise<void> {
  if (response.ok) return;
  if (response.status === 403) throw new AccessDeniedError();
  let message = "";
  try {
    message = (await response.json())?.message ?? "";
  } catch {
    // The fallback below covers non-JSON responses.
  }
  throw new Error(message || `Erreur ${response.status} lors du chargement des dossiers.`);
}

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
  await checkResponse(response);
  const page = await response.json();
  if (!page || !Array.isArray(page.dossiers) || typeof page.total !== "number") {
    throw new Error("Réponse invalide reçue du serveur pour les dossiers.");
  }
  return page as DossiersPage;
}
