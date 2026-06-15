import { store } from "../store.svelte.ts";

import type { default as Contrôle } from "@pitchou/types/database/public/Contrôle.ts";
import type { RésultatContrôle, TypesActionSuiteContrôle } from "@pitchou/types/API_Pitchou.ts";

export const résultatsContrôle: Set<RésultatContrôle> = new Set([
  "Conforme",
  "Non conforme",
  "Trop tard",
  "En cours",
  "Non conforme (Pas d'informations reçues)",
]);

export const typesActionSuiteContrôle: Set<TypesActionSuiteContrôle> = new Set([
  "Email",
  "Courrier",
  "Courrier recommandé avec accusé de réception",
]);

export function ajouterContrôle(contrôle: Partial<Contrôle>): Promise<Contrôle["id"]> {
  const addOrUpdateControle = store.capabilities.addOrUpdateControle;
  if (!addOrUpdateControle) {
    throw new Error(`Pas les droits suffisants pour ajouter un contrôle`);
  }
  // Le serveur renvoie un tableau d'ids pour le cas "ajout"
  // @ts-ignore
  return addOrUpdateControle(contrôle).then((ids) => ids[0]);
}

export function modifierContrôle(contrôle: Partial<Contrôle>): Promise<Contrôle["id"] | undefined> {
  const addOrUpdateControle = store.capabilities.addOrUpdateControle;
  if (!addOrUpdateControle) {
    throw new Error(`Pas les droits suffisants pour modifier un contrôle`);
  }
  return addOrUpdateControle(contrôle);
}

export function supprimerContrôle(id: Contrôle["id"]): Promise<unknown> {
  const deleteControle = store.capabilities.deleteControle;
  if (!deleteControle) {
    throw new Error(`Pas les droits suffisants pour supprimer un contrôle`);
  }
  return deleteControle(id);
}
