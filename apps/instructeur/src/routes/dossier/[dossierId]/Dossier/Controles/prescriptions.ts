import { envoyerEvenement, envoyerEvenementModifierPrescription } from "$lib/shared/aarri.ts";
import { store } from "$lib/state/store.svelte.ts";

import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export function ajouterPrescription(
  prescription: Partial<Prescription>,
): Promise<Prescription["id"] | undefined> {
  const addOrUpdatePrescription = store.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour ajouter une prescription`);
  }

  envoyerEvenement({ type: "ajouterPrescription" });

  return addOrUpdatePrescription(prescription);
}

export function ajouterPrescriptionsEtControles(prescription: Omit<FrontEndPrescription, "id">[]) {
  const addPrescriptionsAndControles = store.capabilities.addPrescriptionsAndControles;
  if (!addPrescriptionsAndControles) {
    throw new Error(`Pas les droits suffisants pour ajouter des prescriptions et contrôles`);
  }

  envoyerEvenement({ type: "ajouterPrescription" });
  envoyerEvenement({ type: "ajouterControle" });

  return addPrescriptionsAndControles(prescription);
}

export function modifierPrescription(
  prescription: Partial<Prescription>,
): Promise<Prescription["id"] | undefined> {
  const addOrUpdatePrescription = store.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour modifier une prescription`);
  }

  envoyerEvenementModifierPrescription();

  return addOrUpdatePrescription(prescription);
}

export function supprimerPrescription(id: Prescription["id"]): Promise<any> {
  const deletePrescription = store.capabilities.deletePrescription;
  if (!deletePrescription) {
    throw new Error(`Pas les droits suffisants pour supprimer une prescription`);
  }

  envoyerEvenement({ type: "supprimerPrescription" });

  return deletePrescription(id);
}
