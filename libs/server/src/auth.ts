import { dossiersAccessibleViaCap } from "./database/dossier.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";

/**
 * Checks that the cap grants full access to the given dossier — a dossier merely
 * shared in read-only mode with the groupe is refused.
 * Writes a 4xx response on reply and returns `undefined` on failure
 */
export async function checkDossierAccessByCap(
  dossierId: Dossier["id"] | undefined,
  cap: string | undefined,
  reply: any,
): Promise<Dossier["id"] | undefined> {
  if (!cap) {
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`);
    return undefined;
  }
  if (!dossierId) {
    reply.code(403).send(`Cap insuffisante ou entité introuvable`);
    return undefined;
  }
  // @ts-ignore: cap arrives as a raw string from the query parameter
  const accessibleDossiers = await dossiersAccessibleViaCap(dossierId, cap);
  if (accessibleDossiers.get(dossierId) !== "complet") {
    reply.code(403).send(`La capability ne permet pas d'accéder au dossier ${dossierId}`);
    return undefined;
  }
  return dossierId;
}
