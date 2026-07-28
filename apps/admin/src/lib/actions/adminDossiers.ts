import { AccessDeniedError } from "./adminEspeces.ts";
import type {
  AdminDossierCreationPayload,
  AdminDossierDetail,
  AdminDossierUpdatePayload,
  AdminGroupeInstructeurs,
  DossiersPage,
  DossiersQuery,
} from "./adminDossierTypes.ts";

export { AccessDeniedError };
export type * from "./adminDossierTypes.ts";

export function defaultDossiersQuery(): DossiersQuery {
  return { search: "", phase: "", source: "", page: 1, pageSize: 50 };
}

async function checkResponse(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  // Surface the server's own message (validation, DN conflict…) when available.
  let message = "";
  try {
    message = (await response.json())?.message ?? "";
  } catch {
    // no JSON body
  }
  throw new Error(message || `Erreur ${response.status} lors de ${action}.`);
}

/** Loads one server-side-filtered page of dossiers. */
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

export async function loadDossierDetail(dossierId: number): Promise<AdminDossierDetail> {
  const response = await fetch(`/api/dossiers/${dossierId}`);
  await checkResponse(response, "du chargement du dossier");
  return (await response.json()) as AdminDossierDetail;
}

export async function createDossier(payload: AdminDossierCreationPayload): Promise<{ id: number }> {
  const response = await fetch(`/api/dossiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await checkResponse(response, "de la création du dossier");
  return (await response.json()) as { id: number };
}

export async function updateDossier(
  dossierId: number,
  payload: AdminDossierUpdatePayload,
): Promise<AdminDossierDetail> {
  const response = await fetch(`/api/dossiers/${dossierId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await checkResponse(response, "de la modification du dossier");
  return (await response.json()) as AdminDossierDetail;
}

export async function deleteDossier(dossierId: number): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}`, { method: "DELETE" });
  await checkResponse(response, "de la suppression du dossier");
}

export async function uploadPieceJointe(dossierId: number, file: File): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`/api/dossiers/${dossierId}/pieces-jointes`, {
    method: "POST",
    body: form,
  });
  await checkResponse(response, "de l'ajout de la pièce jointe");
}

export async function deletePieceJointe(dossierId: number, fichierId: string): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}/pieces-jointes/${fichierId}`, {
    method: "DELETE",
  });
  await checkResponse(response, "de la suppression de la pièce jointe");
}

export async function uploadEspecesImpactees(dossierId: number, file: File): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`/api/dossiers/${dossierId}/especes-impactees`, {
    method: "POST",
    body: form,
  });
  await checkResponse(response, "de l'envoi du fichier espèces impactées");
}

export async function deleteEspecesImpactees(dossierId: number): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}/especes-impactees`, {
    method: "DELETE",
  });
  await checkResponse(response, "de la suppression du fichier espèces impactées");
}

export async function loadGroupesInstructeurs(): Promise<AdminGroupeInstructeurs[]> {
  const response = await fetch(`/api/groupes-instructeurs`);
  await checkResponse(response, "du chargement des groupes instructeurs");

  const groupes = await response.json();
  if (!Array.isArray(groupes)) {
    throw new Error("Réponse invalide reçue du serveur pour les groupes instructeurs.");
  }
  return groupes as AdminGroupeInstructeurs[];
}
