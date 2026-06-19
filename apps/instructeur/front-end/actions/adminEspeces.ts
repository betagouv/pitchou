import remember from "remember";

import { PITCHOU_SECRET_STORAGE_KEY } from "./main.ts";
import { dbRowToEspeceProtegee } from "@pitchou/common/outils-espèces.ts";

import type { EspèceProtégée } from "@pitchou/types/especes.d.ts";
import type { default as EspeceProtegee } from "@pitchou/types/database/public/EspeceProtegee.ts";

/**
 * Thrown when the user is not connected or not an admin (no secret, or 403).
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
  exclu: boolean;
  modifie_par: string | null;
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
  exclu: boolean;
};

/** Reads the stored code d'accès, or throws {@link AccessDeniedError} if absent. */
async function storedSecret(): Promise<string> {
  const stored = await remember(PITCHOU_SECRET_STORAGE_KEY);
  const secret = typeof stored === "string" ? stored : "";
  if (!secret) {
    throw new AccessDeniedError("Vous devez être connecté·e pour accéder à cette page.");
  }
  return secret;
}

/**
 * Loads the full especes_protegees list for the admin page. The stored secret
 * authenticates the request; the server enforces
 * that it belongs to an admin and answers 403 otherwise.
 */
export async function chargerEspecesProtegeesAdmin(): Promise<EspèceProtégée[]> {
  const secret = await storedSecret();

  const response = await fetch(`/api/admin/especes-protegees?secret=${encodeURIComponent(secret)}`);

  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors du chargement des espèces protégées : ${response.statusText}`,
    );
  }

  const lignes: EspeceProtegee[] = await response.json();
  if (!Array.isArray(lignes)) {
    throw new Error("Réponse invalide reçue du serveur pour /api/admin/especes-protegees.");
  }

  return lignes.map(dbRowToEspeceProtegee);
}

/**
 * Loads the manual-layer modifications (enriched with reference context) for the
 * admin edition page. Throws {@link AccessDeniedError} when not connected or 403.
 */
export async function loadModificationsEspecesAdmin(): Promise<ModificationEspeceAdmin[]> {
  const secret = await storedSecret();

  const response = await fetch(
    `/api/admin/especes-protegees/modifications?secret=${encodeURIComponent(secret)}`,
  );

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
  const secret = await storedSecret();

  const response = await fetch(
    `/api/admin/especes-protegees/modifications/${encodeURIComponent(cd_ref)}?secret=${encodeURIComponent(secret)}`,
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
  const secret = await storedSecret();

  const response = await fetch(
    `/api/admin/especes-protegees/modifications/${encodeURIComponent(cd_ref)}?secret=${encodeURIComponent(secret)}`,
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
