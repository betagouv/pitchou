import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { indicatorsAARRI } from "@pitchou/server/database/aarri.ts";

export const GET: RequestHandler = async () => {
  return json(await indicatorsAARRI());
};
