import type { UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";

export async function downloadEvenementsCSV(): Promise<void> {
  const response = await fetch(`/api/evenements-metriques-csv`);

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
 * Loads the AARRI level of every Pitchou user for the admin page. The Admin app
 * session cookie authenticates the request; the server answers 403 if the
 * session does not belong to an admin.
 */
export async function loadUtilisateursAARRI(): Promise<UtilisateurAARRI[]> {
  const response = await fetch(`/api/utilisateurs-aarri`);

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
    throw new Error("Réponse invalide reçue du serveur pour /api/utilisateurs-aarri.");
  }
  return result as UtilisateurAARRI[];
}
