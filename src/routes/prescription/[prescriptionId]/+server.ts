import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  supprimerPrescription,
  getDossierIdFromPrescription,
} from "$server/database/prescription.js";
import type { PrescriptionId } from "$types/database/public/Prescription.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const prescriptionId = params.prescriptionId as PrescriptionId;

  const dossierId = await getDossierIdFromPrescription(prescriptionId);
  await requireDossierAccessByCap(dossierId, cap);

  await supprimerPrescription(prescriptionId);
  return new Response(null, { status: 204 });
};
