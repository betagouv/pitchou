import { checkResponse } from "./adminResponse.ts";

/** An entry of a dossier's historique, as returned by the synchronization simulation. */
export type SimulatedAction = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string | Date;
  author_petitionnaire: boolean;
};

/**
 * Replays a pétitionnaire modification through the real synchronization path.
 * Only available outside production.
 */
export async function simulateDossierSync(
  dossierId: number,
  champ: string,
  valeur: string,
): Promise<{ changed: boolean; actions: SimulatedAction[] }> {
  const response = await fetch(`/api/dossiers/${dossierId}/simuler-synchronisation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ champ, valeur }),
  });
  await checkResponse(response, "de la simulation de synchronisation");
  return await response.json();
}
