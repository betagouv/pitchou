import { sendEvenement, sendEvenementModifierPrescription } from "$lib/shared/aarri.ts";
import { store } from "$lib/state/store.svelte.ts";

import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export function addPrescription(
  prescription: Partial<Prescription>,
): Promise<Prescription["id"] | undefined> {
  const addOrUpdatePrescription = store.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour ajouter une prescription`);
  }

  sendEvenement({ type: "ajouterPrescription" });

  return addOrUpdatePrescription(prescription);
}

export function addPrescriptionsEtControles(prescription: Omit<FrontEndPrescription, "id">[]) {
  const addPrescriptionsAndControles = store.capabilities.addPrescriptionsAndControles;
  if (!addPrescriptionsAndControles) {
    throw new Error(`Pas les droits suffisants pour ajouter des prescriptions et contrôles`);
  }

  sendEvenement({ type: "ajouterPrescription" });
  sendEvenement({ type: "ajouterControle" });

  return addPrescriptionsAndControles(prescription);
}

export function updatePrescription(
  prescription: Partial<Prescription>,
): Promise<Prescription["id"] | undefined> {
  const addOrUpdatePrescription = store.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour modifier une prescription`);
  }

  sendEvenementModifierPrescription();

  return addOrUpdatePrescription(prescription);
}

export function deletePrescription(id: Prescription["id"]): Promise<any> {
  const deletePrescription = store.capabilities.deletePrescription;
  if (!deletePrescription) {
    throw new Error(`Pas les droits suffisants pour supprimer une prescription`);
  }

  sendEvenement({ type: "supprimerPrescription" });

  return deletePrescription(id);
}
