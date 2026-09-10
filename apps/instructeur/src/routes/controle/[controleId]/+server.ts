import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { deleteControle, getDossierIdFromControle } from "@pitchou/server/database/controle.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { ControleId } from "@pitchou/types/database/public/Controle.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const controleId = params.controleId as ControleId;

  const dossierId = await getDossierIdFromControle(controleId);
  await requireDossierAccessByCap(dossierId, cap);

  await directDatabaseConnection.transaction(async (transaction) => {
    await deleteControle(controleId, transaction);
    const author = await getPersonneByDossierCap(cap, transaction);
    await logDossierActions(
      [
        {
          dossier: dossierId!,
          type: "controle_supprime",
          data: {},
          author_personne: author?.id ?? null,
        },
      ],
      transaction,
    );
  });
  return new Response(null, { status: 204 });
};
