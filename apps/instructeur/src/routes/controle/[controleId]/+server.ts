import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireUserId, requireDossierAccess, lockDossierAccess } from "#lib/server/auth.ts";
import { deleteControle, getDossierIdFromControle } from "@pitchou/server/database/controle.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { ControleId } from "@pitchou/types/database/public/Controle.ts";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const controleId = params.controleId as ControleId;

  await directDatabaseConnection.transaction(async (transaction) => {
    await lockDossierAccess(transaction);
    const dossierId = await requireDossierAccess(
      await getDossierIdFromControle(controleId, transaction),
      userId,
      transaction,
    );
    await deleteControle(controleId, transaction);
    const author = await getUserById(userId, transaction);
    await logDossierActions(
      [
        {
          dossier: dossierId,
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
