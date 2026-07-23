import { dbRowToEspeceProtegee } from "@pitchou/common/especesUtils.ts";

import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type { default as EspeceProtegeeRow } from "@pitchou/types/database/public/EspeceProtegee.ts";

/**
 * Thrown when the session does not belong to an admin (403).
 */
export class AccessDeniedError extends Error {
  constructor(message = "Accès réservé aux administrateurs.") {
    super(message);
    this.name = "AccessDenied";
  }
}

export type ModificationEspeceAdmin = {
  cd_ref: string;
  classification: string | null;
  noms_scientifiques: string[] | null;
  noms_vernaculaires: string[] | null;
  cd_type_statuts: string[] | null;
  espece_ministerielle: boolean | null;
  espece_cnpn: boolean | null;
  excluded: boolean;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  reference_noms_scientifiques: string[] | null;
  reference_classification: string | null;
  reference_cd_type_statuts: string[] | null;
  reference_noms_vernaculaires: string[] | null;
};

/** `null` means « inherit from the reference ». */
export type PatchModificationEspece = {
  classification: string | null;
  noms_scientifiques: string[] | null;
  noms_vernaculaires: string[] | null;
  cd_type_statuts: string[] | null;
  espece_ministerielle: boolean | null;
  espece_cnpn: boolean | null;
  excluded: boolean;
};

/**
 * Loads the full especes_protegees list for the admin page. The Admin app
 * session cookie authenticates the request; the server answers 403 if the
 * session does not belong to an admin.
 */
export async function loadEspecesProtegeesAdmin(): Promise<EspeceProtegee[]> {
  const response = await fetch(`/api/especes-protegees`);

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors du chargement des espèces protégées : ${response.statusText}`,
    );
  }

  const rows: EspeceProtegeeRow[] = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Réponse invalide reçue du serveur pour /api/especes-protegees.");
  }

  return rows.map(dbRowToEspeceProtegee);
}

/**
 * Loads the manual-layer modifications (enriched with reference context) for the
 * admin edition page. Throws {@link AccessDeniedError} on 403.
 */
export async function loadModificationsEspecesAdmin(): Promise<ModificationEspeceAdmin[]> {
  const response = await fetch(`/api/especes-protegees/modifications`);

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors du chargement des modifications : ${response.statusText}`,
    );
  }

  const modifications = await response.json();
  if (!Array.isArray(modifications)) {
    throw new Error("Réponse invalide reçue du serveur pour les modifications d'espèces.");
  }

  return modifications;
}

/**
 * Creates or updates the manual modification for `cd_ref`. The patch is sparse:
 * only the keys present are written, so a single field can be saved on its own.
 */
export async function saveModificationEspece(
  cd_ref: string,
  patch: Partial<PatchModificationEspece>,
): Promise<void> {
  const response = await fetch(
    `/api/especes-protegees/modifications/${encodeURIComponent(cd_ref)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Erreur ${response.status} lors de l'enregistrement de la modification : ${message || response.statusText}`,
    );
  }
}

/** Removes the manual modification for `cd_ref`, reverting it to the reference. */
export async function deleteModificationEspece(cd_ref: string): Promise<void> {
  const response = await fetch(
    `/api/especes-protegees/modifications/${encodeURIComponent(cd_ref)}`,
    { method: "DELETE" },
  );

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors de la suppression de la modification : ${response.statusText}`,
    );
  }
}
