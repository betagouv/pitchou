import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { getRecentSearchesForUser } from "@pitchou/server/database/dossier_search.ts";

export const GET: RequestHandler = async ({ locals }) => {
  const userId = requireUserId(locals);

  return json(await getRecentSearchesForUser(userId));
};
