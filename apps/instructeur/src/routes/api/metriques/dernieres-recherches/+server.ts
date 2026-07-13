import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { getRecentSearchesFromCap } from "@pitchou/server/database/dossier_search.ts";

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);

  return json(await getRecentSearchesFromCap(cap));
};
