import remember from "remember";

import { PITCHOU_SECRET_STORAGE_KEY } from "./main.ts";
import { dbRowToEspeceProtegee } from "../../commun/outils-espèces.ts";

import type { EspèceProtégée } from "../../types/especes.d.ts";
import type { default as EspeceProtegee } from "../../types/database/public/EspeceProtegee.ts";

/**
 * Loads the full protected-species list for the admin page. The stored secret
 * (the personne's code d'accès) authenticates the request; the server enforces
 * that it belongs to an admin and answers 403 otherwise.
 */
export async function chargerEspecesProtegeesAdmin(): Promise<EspèceProtégée[]> {
  const stored = await remember(PITCHOU_SECRET_STORAGE_KEY);
  const secret = typeof stored === "string" ? stored : "";
  if (!secret) {
    throw new Error("Vous devez être connecté·e pour accéder à cette page.");
  }

  const response = await fetch(`/api/admin/especes-protegees?secret=${encodeURIComponent(secret)}`);

  if (response.status === 403) {
    throw new Error("Accès réservé aux administrateurs.");
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
