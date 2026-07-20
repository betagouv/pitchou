import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getPublicStats } from "@pitchou/server/database/stats.ts";

export const GET: RequestHandler = async () => {
  return json(await getPublicStats());
};
