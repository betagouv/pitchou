import store from "../store.js";

/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */
/** @import {RésultatContrôle, TypesActionSuiteContrôle} from '../../types/API_Pitchou.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/** @type {Set<RésultatContrôle>} */
export const résultatsContrôle = new Set([
  "Conforme",
  "Non conforme",
  "Trop tard",
  "En cours",
  "Non conforme (Pas d'informations reçues)",
]);

/** @type {Set<TypesActionSuiteContrôle>} */
export const typesActionSuiteContrôle = new Set([
  "Email",
  "Courrier",
  "Courrier recommandé avec accusé de réception",
]);

/**
 *
 * @param {Partial<Contrôle>} contrôle
 * @returns {Promise<Contrôle['id']>}
 */
export function ajouterContrôle(contrôle) {
  const addOrUpdateControle = store.state.capabilities.addOrUpdateControle;
  if (!addOrUpdateControle) {
    throw new Error(`Pas les droits suffisants pour ajouter un contrôle`);
  }
  // Le serveur renvoie un tableau d'ids pour le cas "ajout"
  // @ts-ignore
  return addOrUpdateControle(contrôle).then((ids) => ids[0]);
}

/**
 *
 * @param {Partial<Contrôle>} contrôle
 * @returns {Promise<Contrôle['id'] | undefined>}
 */
export function modifierContrôle(contrôle) {
  const addOrUpdateControle = store.state.capabilities.addOrUpdateControle;
  if (!addOrUpdateControle) {
    throw new Error(`Pas les droits suffisants pour modifier un contrôle`);
  }
  return addOrUpdateControle(contrôle);
}

/**
 *
 * @param {Contrôle['id']} id
 * @returns {Promise<unknown>}
 */
export function supprimerContrôle(id) {
  const deleteControle = store.state.capabilities.deleteControle;
  if (!deleteControle) {
    throw new Error(`Pas les droits suffisants pour supprimer un contrôle`);
  }
  return deleteControle(id);
}
