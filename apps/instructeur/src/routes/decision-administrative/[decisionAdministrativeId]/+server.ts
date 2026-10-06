import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierAccess } from "$lib/server/auth";
import {
  deleteDecisionAdministrative,
  getDossierIdFromDecisionAdministrative,
} from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActionsAfterCommit } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { DecisionAdministrativeId } from "@pitchou/types/database/public/DecisionAdministrative.ts";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const decisionAdministrativeId = params.decisionAdministrativeId as DecisionAdministrativeId;

  const dossierId = await getDossierIdFromDecisionAdministrative(decisionAdministrativeId);
  const authorizedDossierId = await requireDossierAccess(dossierId, userId);

  await deleteDecisionAdministrative(decisionAdministrativeId);
  await logDossierActionsAfterCommit(
    (async () => {
      const author = await getUserById(userId);
      return [
        {
          dossier: authorizedDossierId,
          type: "decision_supprimee",
          data: {},
          author_personne: author?.id ?? null,
        },
      ];
    })(),
  );
  return new Response(null, { status: 204 });
};
