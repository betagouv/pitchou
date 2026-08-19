import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  deleteDecisionAdministrative,
  getDossierIdFromDecisionAdministrative,
} from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { DecisionAdministrativeId } from "@pitchou/types/database/public/DecisionAdministrative.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const decisionAdministrativeId = params.decisionAdministrativeId as DecisionAdministrativeId;

  const dossierId = await getDossierIdFromDecisionAdministrative(decisionAdministrativeId);
  const authorizedDossierId = await requireDossierAccessByCap(dossierId, cap);

  await deleteDecisionAdministrative(decisionAdministrativeId);
  const author = await getPersonneByDossierCap(cap);
  await logDossierActions([
    {
      dossier: authorizedDossierId,
      type: "decision_supprimee",
      data: {},
      author_personne: author?.id ?? null,
    },
  ]);
  return new Response(null, { status: 204 });
};
