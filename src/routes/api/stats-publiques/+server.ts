import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStatsPubliques } from "$server/database/stats.js";

export const GET: RequestHandler = async () => {
  return json(await getStatsPubliques());
};
