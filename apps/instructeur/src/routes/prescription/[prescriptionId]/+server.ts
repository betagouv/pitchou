import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireUserId, requireDossierAccess, lockDossierAccess } from "#lib/server/auth.ts";
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

  await directDatabaseConnection.transaction(async (transaction) => {
    await lockDossierAccess(transaction);
    const dossierId = await requireDossierAccess(
      await getDossierIdFromPrescription(prescriptionId, transaction),
      userId,
      transaction,
    );
    await deletePrescription(prescriptionId, transaction);
    const author = await getUserById(userId, transaction);
    await logDossierActions(
      [
        {
          dossier: dossierId,
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
