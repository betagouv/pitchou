import { AccessDeniedError } from "./adminEspeces.ts";
import { checkResponse } from "./adminResponse.ts";
import {
  emptyDossierCreationAttachments,
  uploadDossierCreationFiles,
  uploadDossierUpdateFiles,
  type DossierCreationAttachments,
} from "./adminDossierUploads.ts";
import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";
import type {
  AdminDossierCreationPayload,
  AdminDossierMinimalCreationPayload,
  AdminDossierDetail,
  AdminDossierUpdatePayload,
  AdminGroupeInstructeurs,
} from "./adminDossierTypes.ts";

export { AccessDeniedError };
export type * from "./adminDossierTypes.ts";
export type { DossierCreationAttachments } from "./adminDossierUploads.ts";
export { defaultDossiersQuery, loadDossiers } from "./adminDossierList.ts";
export { simulateDossierSync, type SimulatedAction } from "./adminDossierSync.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function loadDossierDetail(dossierId: number): Promise<AdminDossierDetail> {
  const response = await fetch(`/api/dossiers/${dossierId}`);
  await checkResponse(response, "du chargement du dossier");
  return (await response.json()) as AdminDossierDetail;
}

/**
 * Creates a dossier. Files go straight to object storage first; the request
 * then carries their references under `uploads`.
 */
export async function createDossier(
  payload: AdminDossierCreationPayload,
  speciesFile?: File | null,
  attachments: DossierCreationAttachments = emptyDossierCreationAttachments(),
): Promise<{ id: number }> {
  const uploads = await uploadDossierCreationFiles(speciesFile, attachments);
  const response = await fetch(`/api/dossiers`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(uploads ? { ...payload, uploads } : payload),
  });
  await checkResponse(response, "de la création du dossier");
  return (await response.json()) as { id: number };
}

export async function createMinimalDossier(
  payload: AdminDossierMinimalCreationPayload,
): Promise<{ id: number }> {
  const response = await fetch(`/api/dossiers/minimal`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  await checkResponse(response, "de la création du dossier");
  return (await response.json()) as { id: number };
}

export async function updateDossier(
  dossierId: number,
  payload: AdminDossierUpdatePayload,
  speciesFile: File | null = null,
  attachments: File[] = [],
): Promise<AdminDossierDetail> {
  const uploads = await uploadDossierUpdateFiles(speciesFile, attachments);
  const response = await fetch(`/api/dossiers/${dossierId}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(uploads ? { ...payload, uploads } : payload),
  });
  await checkResponse(response, "de la modification du dossier");
  return (await response.json()) as AdminDossierDetail;
}

export async function deleteDossier(dossierId: number): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}`, { method: "DELETE" });
  await checkResponse(response, "de la suppression du dossier");
}

/** Sends one file to storage, then attaches it through `path` with a `{ file }` body. */
async function attachSingleFile(path: string, file: File, action: string): Promise<void> {
  const [upload] = await uploadFichiers([file]);
  const response = await fetch(path, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ file: upload }),
  });
  await checkResponse(response, action);
}

export function uploadPieceJointe(dossierId: number, file: File): Promise<void> {
  return attachSingleFile(
    `/api/dossiers/${dossierId}/pieces-jointes`,
    file,
    "de l'ajout de la pièce jointe",
  );
}

export async function deletePieceJointe(dossierId: number, fichierId: string): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}/pieces-jointes/${fichierId}`, {
    method: "DELETE",
  });
  await checkResponse(response, "de la suppression de la pièce jointe");
}

export function uploadEspecesImpactees(dossierId: number, file: File): Promise<void> {
  return attachSingleFile(
    `/api/dossiers/${dossierId}/especes-impactees`,
    file,
    "de l'envoi du fichier espèces impactées",
  );
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
