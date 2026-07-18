import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  deleteAvisExpert,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const avisExpertId = params.avisExpertId as AvisExpertId;

  const dossierId = await getDossierIdFromAvisExpert(avisExpertId);
  await requireDossierAccessByCap(dossierId, cap);

  await deleteAvisExpert(avisExpertId);
  return new Response(null, { status: 204 });
};
