import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { getRelationSuivis, createTransaction } from "@pitchou/server/database.ts";
import {
  findFollowerUser,
  instructeurFollowsDossier,
  instructeurLeavesDossier,
  personneFollowsDossier,
} from "@pitchou/server/database/relation_suivi.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { PitchouInstructeurCapabilities } from "@pitchou/types/capabilities.ts";

export const GET: RequestHandler = async ({ locals }) => {
  const userId = requireUserId(locals);
  const followRelations = await getRelationSuivis(userId);
  if (!followRelations) {
    error(403, `Le paramètre 'userId' est invalide`);
  }
  return json(followRelations);
};

type ChangerSuiviParams = Parameters<PitchouInstructeurCapabilities["updateFollowRelation"]>;
type ChangerSuiviBody = {
  direction: ChangerSuiviParams[0];
  personneEmail: ChangerSuiviParams[1];
  dossierId: ChangerSuiviParams[2];
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = requireUserId(locals);
  const { direction, personneEmail, dossierId } = (await request.json()) as ChangerSuiviBody;

  const transaction = await createTransaction();

  try {
    await transaction.raw("select pg_advisory_xact_lock(2105102026)");
    const relationsSuiviViaCap = await findFollowerUser(
      userId,
      personneEmail,
      dossierId,
      transaction,
    );

    if (relationsSuiviViaCap.length === 0) {
      await transaction.rollback();
      error(
        403,
        `La capability ${userId} ne permet pas de modifier la relation de suivi entre instructeur.rice ${personneEmail} et dossier ${dossierId}`,
      );
    }

    const personne = await getUserById(userId, transaction);
    if (!personne) {
      await transaction.rollback();
      error(400, `Pas de personne avec l'adresse email ${personneEmail}`);
    }

    const alreadyFollowing = await personneFollowsDossier(personne.id, dossierId, transaction);

    if (direction === "suivre") {
      await instructeurFollowsDossier(personne.id, dossierId, transaction);
    } else if (direction === "laisser") {
      await instructeurLeavesDossier(personne.id, dossierId, transaction);
    } else {
      await transaction.rollback();
      error(500, `Direction ${direction} non reconnue.`);
    }

    // Historique entry, only when the follow relation actually changed.
    if ((direction === "suivre") !== alreadyFollowing) {
      const actor = await getUserById(userId);
      await logDossierActions(
        [
          {
            dossier: dossierId,
            type: direction === "suivre" ? "dossier_suivi" : "dossier_suivi_termine",
            data: {
              follower: personneEmail,
              requested_by:
                direction === "suivre" && actor?.email && actor.email !== personneEmail
                  ? actor.email
                  : null,
            },
            author_personne: actor?.id ?? null,
          },
        ],
        transaction,
      );
    }

    await transaction.commit();
    return new Response(null, { status: 204 });
  } catch (err) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    throw err;
  }
};
