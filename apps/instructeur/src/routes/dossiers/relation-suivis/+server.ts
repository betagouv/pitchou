import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { getRelationSuivis, createTransaction } from "@pitchou/server/database.ts";
import {
  findRelationPersonneFromCap,
  instructeurFollowsDossier,
  instructeurLeavesDossier,
} from "@pitchou/server/database/relation_suivi.ts";
import { getPersonneByEmail } from "@pitchou/server/database/personne.ts";
import type { PitchouInstructeurCapabilities } from "@pitchou/types/capabilities.ts";

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);
  const followRelations = await getRelationSuivis(cap);
  if (!followRelations) {
    error(403, `Le paramètre 'cap' est invalide`);
  }
  return json(followRelations);
};

type ChangerSuiviParams = Parameters<PitchouInstructeurCapabilities["updateFollowRelation"]>;
type ChangerSuiviBody = {
  direction: ChangerSuiviParams[0];
  personneEmail: ChangerSuiviParams[1];
  dossierId: ChangerSuiviParams[2];
};

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const { direction, personneEmail, dossierId } = (await request.json()) as ChangerSuiviBody;

  const transaction = await createTransaction();

  try {
    const relationsSuiviViaCap = await findRelationPersonneFromCap(
      cap,
      personneEmail,
      dossierId,
      transaction,
    );

    if (relationsSuiviViaCap.length === 0) {
      await transaction.rollback();
      error(
        403,
        `La capability ${cap} ne permet pas de modifier la relation de suivi entre instructeur.rice ${personneEmail} et dossier ${dossierId}`,
      );
    }

    const personne = await getPersonneByEmail(personneEmail, transaction);
    if (!personne) {
      await transaction.rollback();
      error(400, `Pas de personne avec l'adresse email ${personneEmail}`);
    }

    if (direction === "suivre") {
      await instructeurFollowsDossier(personne.id, dossierId, transaction);
    } else if (direction === "laisser") {
      await instructeurLeavesDossier(personne.id, dossierId, transaction);
    } else {
      await transaction.rollback();
      error(500, `Direction ${direction} non reconnue.`);
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
