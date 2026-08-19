import { AccessDeniedError } from "./adminEspeces.ts";

/**
 * Turns a failed admin API response into an error. `action` completes the
 * fallback message, e.g. "du chargement du dossier".
 */
export async function checkResponse(response: Response, action: string): Promise<void> {
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
