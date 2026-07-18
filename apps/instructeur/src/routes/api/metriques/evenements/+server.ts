import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { evenementMetriqueGuard } from "@pitchou/server/evenements_metriques.ts";
import { addEvenementFromCap } from "@pitchou/server/database/evenements_metriques.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const evenement = await request.json();

  if (!evenementMetriqueGuard(evenement)) {
    error(400, "Objet évènement mal formé");
  }

  try {
    await addEvenementFromCap(cap, evenement);
  } catch (e) {
    // TODO: improve error handling here
    console.error(e);
  }

  return json({ succès: true });
};
