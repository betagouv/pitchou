import { store } from "#lib/state/store.svelte.ts";

import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { PrescriptionWithNewControles } from "@pitchou/types/API_Pitchou.ts";

export function addPrescription(prescription: Partial<Prescription>): Promise<Prescription["id"]> {
  const addOrUpdatePrescription = store.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour ajouter une prescription`);
  }

  return addOrUpdatePrescription(prescription).then((result) => {
    if (typeof result === "number")
      throw new Error("Identifiant de prescription absent de la réponse");
    return result.prescriptionId;
  });
}

export function addPrescriptionsAndControles(prescription: PrescriptionWithNewControles[]) {
  const addPrescriptionsAndControles = store.capabilities.addPrescriptionsAndControles;
  if (!addPrescriptionsAndControles) {
    throw new Error(`Pas les droits suffisants pour ajouter des prescriptions et contrôles`);
  }

  return addPrescriptionsAndControles(prescription);
}

export function updatePrescription(prescription: Partial<Prescription>): Promise<void> {
  const addOrUpdatePrescription = store.capabilities.addOrUpdatePrescription;
  if (!addOrUpdatePrescription) {
    throw new Error(`Pas les droits suffisants pour modifier une prescription`);
  }

  return addOrUpdatePrescription(prescription).then(() => {});
}

export function deletePrescription(id: Prescription["id"]): Promise<any> {
  const deletePrescription = store.capabilities.deletePrescription;
  if (!deletePrescription) {
    throw new Error(`Pas les droits suffisants pour supprimer une prescription`);
  }

  return deletePrescription(id);
}
