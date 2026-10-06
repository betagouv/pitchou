import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { evenementMetriqueGuard } from "@pitchou/server/evenements_metriques.ts";
import { addEvenementForUser } from "@pitchou/server/database/evenements_metriques.ts";

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = requireUserId(locals);
  const event = await request.json();

  if (!evenementMetriqueGuard(event)) {
    error(400, "Objet évènement mal formé");
  }

  try {
    await addEvenementForUser(userId, event);
  } catch (e) {
    // TODO: improve error handling here
    console.error(e);
  }

  return json({ succès: true });
};
