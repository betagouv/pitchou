import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  addPrescription,
  updatePrescription,
  getDossierIdFromPrescription,
} from "@pitchou/server/database/prescription.ts";
import { getDossierIdFromDecisionAdministrative } from "@pitchou/server/database/decision_administrative.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";

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
      ? await updatePrescription(prescriptionData)
      : await addPrescription(prescriptionData);
    return json(prescriptionId);
  } catch (err) {
    error(500, `Erreur lors de l'ajout/modification de prescription. ${err}`);
  }
};
