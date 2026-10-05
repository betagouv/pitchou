import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierAccess } from "$lib/server/auth";
import {
  deleteAvisExpert,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import { logDossierActionsAfterCommit } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const avisExpertId = params.avisExpertId as AvisExpertId;

  const dossierId = await getDossierIdFromAvisExpert(avisExpertId);
  const authorizedDossierId = await requireDossierAccess(dossierId, userId);

  await deleteAvisExpert(avisExpertId);
  await logDossierActionsAfterCommit(
    (async () => {
      const author = await getUserById(userId);
      return [
        {
          dossier: authorizedDossierId,
          type: "avis_supprime",
          data: {},
          author_personne: author?.id ?? null,
        },
      ];
    })(),
  );
  return new Response(null, { status: 204 });
};
