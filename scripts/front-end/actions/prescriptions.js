import { envoyerÉvènement, envoyerÉvènementModifierPrescription } from "./aarri.js";
import store from "../store.js";

/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */
/** @import {FrontEndPrescription} from '../../types/API_Pitchou.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 *
 * @param {Partial<Prescription>} prescription
 * @returns {Promise<Prescription['id'] | undefined>}
 */
export function ajouterPrescription(prescription) {
  const addOrUpdatePrescription = store.state.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour ajouter une prescription`);
  }

  envoyerÉvènement({ type: "ajouterPrescription" });

  return addOrUpdatePrescription(prescription);
}

/**
 *
 * @param {Omit<FrontEndPrescription, 'id'>[]} prescription
 */
export function ajouterPrescriptionsEtContrôles(prescription) {
  const addPrescriptionsAndControles = store.state.capabilities.addPrescriptionsAndControles;
  if (!addPrescriptionsAndControles) {
    throw new Error(`Pas les droits suffisants pour ajouter des prescriptions et contrôles`);
  }

  envoyerÉvènement({ type: "ajouterPrescription" });
  envoyerÉvènement({ type: "ajouterContrôle" });

  return addPrescriptionsAndControles(prescription);
}

/**
 *
 * @param {Partial<Prescription>} prescription
 * @returns {Promise<Prescription['id'] | undefined>}
 */
export function modifierPrescription(prescription) {
  const addOrUpdatePrescription = store.state.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour modifier une prescription`);
  }

  envoyerÉvènementModifierPrescription();

  return addOrUpdatePrescription(prescription);
}

/**
 *
 * @param {Prescription['id']} id
 * @returns {Promise<any>}
 */
export function supprimerPrescription(id) {
  const deletePrescription = store.state.capabilities.deletePrescription;
  if (!deletePrescription) {
    throw new Error(`Pas les droits suffisants pour supprimer une prescription`);
  }

  envoyerÉvènement({ type: "supprimerPrescription" });

  return deletePrescription(id);
}
