import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  deleteAvisExpert,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const avisExpertId = params.avisExpertId as AvisExpertId;

  const dossierId = await getDossierIdFromAvisExpert(avisExpertId);
  const authorizedDossierId = await requireDossierAccessByCap(dossierId, cap);

  await deleteAvisExpert(avisExpertId);
  const author = await getPersonneByDossierCap(cap);
  await logDossierActions([
    {
      dossier: authorizedDossierId,
      type: "avis_supprime",
      data: {},
      author_personne: author?.id ?? null,
    },
  ]);
  return new Response(null, { status: 204 });
};
