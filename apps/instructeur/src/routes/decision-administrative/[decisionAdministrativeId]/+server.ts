import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  deleteDecisionAdministrative,
  getDossierIdFromDecisionAdministrative,
} from "@pitchou/server/database/decision_administrative.ts";
import type { DecisionAdministrativeId } from "@pitchou/types/database/public/DecisionAdministrative.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const decisionAdministrativeId = params.decisionAdministrativeId as DecisionAdministrativeId;

  const dossierId = await getDossierIdFromDecisionAdministrative(decisionAdministrativeId);
  await requireDossierAccessByCap(dossierId, cap);

  await deleteDecisionAdministrative(decisionAdministrativeId);
  return new Response(null, { status: 204 });
};
