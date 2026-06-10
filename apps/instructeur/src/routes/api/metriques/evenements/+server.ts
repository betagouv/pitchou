import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { évènementMétriqueGuard } from "@pitchou/server/évènements_métriques.ts";
import { ajouterÉvènementDepuisCap } from "@pitchou/server/database/évènements_métriques.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const evenement = await request.json();

  if (!évènementMétriqueGuard(evenement)) {
    error(400, "Objet évènement mal formé");
  }

  try {
    await ajouterÉvènementDepuisCap(cap, evenement);
  } catch (e) {
    // TODO: améliorer la gestion d’erreur ici
    console.error(e);
  }

  return json({ succès: true });
};
