import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  deletePrescription,
  getDossierIdFromPrescription,
} from "@pitchou/server/database/prescription.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { PrescriptionId } from "@pitchou/types/database/public/Prescription.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const prescriptionId = params.prescriptionId as PrescriptionId;

  const dossierId = await getDossierIdFromPrescription(prescriptionId);
  const authorizedDossierId = await requireDossierAccessByCap(dossierId, cap);

  await deletePrescription(prescriptionId);
  const author = await getPersonneByDossierCap(cap);
  await logDossierActions([
    {
      dossier: authorizedDossierId,
      type: "prescription_supprimee",
      data: {},
      author_personne: author?.id ?? null,
    },
  ]);
  return new Response(null, { status: 204 });
};
