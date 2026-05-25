//@ts-check

import { dossiersAccessibleViaCap } from "./database/dossier.js";

/** @import {default as Dossier} from '../types/database/public/Dossier.ts' */

/**
 * Checks that the cap grants access to the given dossier
 * Writes a 4xx response on reply and returns `undefined` on failure
 *
 * @param {Dossier['id'] | undefined} dossierId
 * @param {string | undefined} cap
 * @param {any} reply
 * @returns {Promise<Dossier['id'] | undefined>}
 */
export async function checkDossierAccessByCap(dossierId, cap, reply) {
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
  if (!accessibleDossiers.has(dossierId)) {
    reply.code(403).send(`La capability ne permet pas d'accéder au dossier ${dossierId}`);
    return undefined;
  }
  return dossierId;
}
