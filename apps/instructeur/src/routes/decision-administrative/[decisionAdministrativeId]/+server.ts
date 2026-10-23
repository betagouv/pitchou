import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierAccess, lockDossierAccess } from "#lib/server/auth.ts";
import {
  deleteDecisionAdministrative,
  getDossierIdFromDecisionAdministrative,
} from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import type { DecisionAdministrativeId } from "@pitchou/types/database/public/DecisionAdministrative.ts";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const decisionAdministrativeId = params.decisionAdministrativeId as DecisionAdministrativeId;

  await directDatabaseConnection.transaction(async (transaction) => {
    await lockDossierAccess(transaction);
    const dossierId = await requireDossierAccess(
      await getDossierIdFromDecisionAdministrative(decisionAdministrativeId, transaction),
      userId,
      transaction,
    );
    await deleteDecisionAdministrative(decisionAdministrativeId, transaction);
    await logDossierActions(
      [{ dossier: dossierId, type: "decision_supprimee", data: {}, author_personne: userId }],
      transaction,
    );
  });
  return new Response(null, { status: 204 });
};
