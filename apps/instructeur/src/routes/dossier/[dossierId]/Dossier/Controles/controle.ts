import { store } from "#lib/state/store.svelte.ts";

import type { default as Controle } from "@pitchou/types/database/public/Controle.ts";
import type { ResultatControle, TypesActionSuiteControle } from "@pitchou/types/API_Pitchou.ts";

export const resultatsControle: Set<ResultatControle> = new Set([
  "Conforme",
  "Non conforme",
  "Trop tard",
  "En cours",
  "Non conforme (Pas d'informations reçues)",
]);

export const typesActionSuiteControle: Set<TypesActionSuiteControle> = new Set([
  "Email",
  "Courrier",
  "Courrier recommandé avec accusé de réception",
]);

export function addControle(controle: Partial<Controle>): Promise<Controle["id"]> {
  const addOrUpdateControle = store.capabilities.addOrUpdateControle;
  if (!addOrUpdateControle) {
    throw new Error(`Pas les droits suffisants pour ajouter un contrôle`);
  }
  // The server returns an array of ids for the "add" case
  return addOrUpdateControle(controle).then((ids) => {
    if (!Array.isArray(ids) || !ids[0])
      throw new Error("Identifiant de contrôle absent de la réponse");
    return ids[0];
  });
}

export function updateControle(controle: Partial<Controle>): Promise<void> {
  const addOrUpdateControle = store.capabilities.addOrUpdateControle;
  if (!addOrUpdateControle) {
    throw new Error(`Pas les droits suffisants pour modifier un contrôle`);
  }
  return addOrUpdateControle(controle).then(() => {});
}

export function deleteControle(id: Controle["id"]): Promise<unknown> {
  const deleteControle = store.capabilities.deleteControle;
  if (!deleteControle) {
    throw new Error(`Pas les droits suffisants pour supprimer un contrôle`);
  }
  return deleteControle(id);
}
