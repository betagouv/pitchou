import remember from "remember";

import { PITCHOU_SECRET_STORAGE_KEY } from "./main.ts";

import type { UtilisateurAARRI } from "../../types/API_Pitchou.ts";

export async function downloadÉvènementsCSV(): Promise<void> {
  const stored = await remember(PITCHOU_SECRET_STORAGE_KEY);
  const secret = typeof stored === "string" ? stored : "";
  if (!secret) {
    throw new Error("Vous devez être connecté·e pour accéder à cette page.");
  }

  const response = await fetch(
    `/api/admin/evenements-metriques-csv?secret=${encodeURIComponent(secret)}`,
  );

  if (response.status === 403) {
    throw new Error("Accès réservé aux administrateurs.");
  }
  if (!response.ok) {
    throw new Error(`Erreur ${response.status} lors du téléchargement : ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evenements_metriques_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Loads the AARRI level of every Pitchou user for the admin page. The stored
 * secret (the personne's code d'accès) authenticates the request; the server
 * enforces that it belongs to an admin and answers 403 otherwise.
 */
export async function loadUtilisateursAARRI(): Promise<UtilisateurAARRI[]> {
  const stored = await remember(PITCHOU_SECRET_STORAGE_KEY);
  const secret = typeof stored === "string" ? stored : "";
  if (!secret) {
    throw new Error("Vous devez être connecté·e pour accéder à cette page.");
  }

  const response = await fetch(
    `/api/admin/utilisateurs-aarri?secret=${encodeURIComponent(secret)}`,
  );

  if (response.status === 403) {
    throw new Error("Accès réservé aux administrateurs.");
  }
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors du chargement des utilisateurices : ${response.statusText}`,
    );
  }

  const result = await response.json();
  if (!Array.isArray(result)) {
    throw new Error("Réponse invalide reçue du serveur pour /api/admin/utilisateurs-aarri.");
  }
  return result as UtilisateurAARRI[];
}
