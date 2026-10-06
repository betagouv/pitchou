import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireUserId, requireDossierAccess } from "$lib/server/auth";
import {
  deletePrescription,
  getDossierIdFromPrescription,
} from "@pitchou/server/database/prescription.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { PrescriptionId } from "@pitchou/types/database/public/Prescription.ts";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const prescriptionId = params.prescriptionId as PrescriptionId;

  const dossierId = await getDossierIdFromPrescription(prescriptionId);
  const authorizedDossierId = await requireDossierAccess(dossierId, userId);

  await directDatabaseConnection.transaction(async (transaction) => {
    await deletePrescription(prescriptionId, transaction);
    const author = await getUserById(userId, transaction);
    await logDossierActions(
      [
        {
          dossier: authorizedDossierId,
          type: "prescription_supprimee",
          data: {},
          author_personne: author?.id ?? null,
        },
      ],
      transaction,
    );
  });
  return new Response(null, { status: 204 });
};
