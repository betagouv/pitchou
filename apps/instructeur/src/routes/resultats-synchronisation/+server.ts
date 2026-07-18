import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDemarcheNumerique88444SynchronizationResults } from "@pitchou/server/database.ts";

export const GET: RequestHandler = async () => {
  return json(await getDemarcheNumerique88444SynchronizationResults());
};
