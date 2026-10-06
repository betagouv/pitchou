import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { getEvenementsPhaseDossiers } from "@pitchou/server/database/dossier.ts";

export const GET: RequestHandler = async ({ locals }) => {
  const userId = requireUserId(locals);
  const evenementsPhase = await getEvenementsPhaseDossiers(userId);
  if (!evenementsPhase) {
    error(403, `Le paramètre 'userId' est invalide`);
  }
  return json(evenementsPhase);
};
