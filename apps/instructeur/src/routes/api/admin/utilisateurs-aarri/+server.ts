import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAdmin } from "$lib/server/auth.ts";
import { getUtilisateursAARRI } from "@pitchou/server/database/utilisateursAARRI.ts";

export const GET: RequestHandler = async ({ url }) => {
  await requireAdmin(url);
  return json(await getUtilisateursAARRI());
};
