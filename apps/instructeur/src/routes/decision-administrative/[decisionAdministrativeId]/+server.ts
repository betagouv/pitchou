import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  supprimerDécisionAdministrative,
  getDossierIdFromDecisionAdministrative,
} from "@pitchou/server/database/décision_administrative.ts";
import type { DCisionAdministrativeId } from "@pitchou/types/database/public/DécisionAdministrative.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const decisionAdministrativeId = params.decisionAdministrativeId as DCisionAdministrativeId;

  const dossierId = await getDossierIdFromDecisionAdministrative(decisionAdministrativeId);
  await requireDossierAccessByCap(dossierId, cap);

  await supprimerDécisionAdministrative(decisionAdministrativeId);
  return new Response(null, { status: 204 });
};
