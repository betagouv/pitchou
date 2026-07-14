import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  deletePrescription,
  getDossierIdFromPrescription,
} from "@pitchou/server/database/prescription.ts";
import type { PrescriptionId } from "@pitchou/types/database/public/Prescription.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const prescriptionId = params.prescriptionId as PrescriptionId;

  const dossierId = await getDossierIdFromPrescription(prescriptionId);
  await requireDossierAccessByCap(dossierId, cap);

  await deletePrescription(prescriptionId);
  return new Response(null, { status: 204 });
};
