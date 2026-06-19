import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { getÉvènementsPhaseDossiers } from "@pitchou/server/database/dossier.ts";

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);
  const evenementsPhase = await getÉvènementsPhaseDossiers(cap);
  if (!evenementsPhase) {
    error(403, `Le paramètre 'cap' est invalide`);
  }
  return json(evenementsPhase);
};
