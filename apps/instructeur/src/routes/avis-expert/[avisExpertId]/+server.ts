import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierAccess, lockDossierAccess } from "#lib/server/auth.ts";
import {
  deleteAvisExpert,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const avisExpertId = params.avisExpertId as AvisExpertId;

  await directDatabaseConnection.transaction(async (transaction) => {
    await lockDossierAccess(transaction);
    const dossierId = await requireDossierAccess(
      await getDossierIdFromAvisExpert(avisExpertId, transaction),
      userId,
      transaction,
    );
    await deleteAvisExpert(avisExpertId, transaction);
    await logDossierActions(
      [{ dossier: dossierId, type: "avis_supprime", data: {}, author_personne: userId }],
      transaction,
    );
  });
  return new Response(null, { status: 204 });
};
