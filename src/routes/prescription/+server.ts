import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  ajouterPrescription,
  modifierPrescription,
  getDossierIdFromPrescription,
} from "$server/database/prescription.js";
import { getDossierIdFromDecisionAdministrative } from "$server/database/décision_administrative.js";
import type Prescription from "$types/database/public/Prescription.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const prescriptionData = (await request.json()) as Partial<Prescription>;

  let dossierId;
  if (prescriptionData.id) {
    dossierId = await getDossierIdFromPrescription(prescriptionData.id);
  } else if (prescriptionData.décision_administrative) {
    dossierId = await getDossierIdFromDecisionAdministrative(
      prescriptionData.décision_administrative,
    );
  }
  await requireDossierAccessByCap(dossierId, cap);

  try {
    const prescriptionId = prescriptionData.id
      ? await modifierPrescription(prescriptionData)
      : await ajouterPrescription(prescriptionData);
    return json(prescriptionId);
  } catch (err) {
    error(500, `Erreur lors de l'ajout/modification de prescription. ${err}`);
  }
};
