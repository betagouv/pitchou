import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { indicateursAARRI } from "@pitchou/server/database/aarri.ts";

export const GET: RequestHandler = async () => {
  return json(await indicateursAARRI());
};
