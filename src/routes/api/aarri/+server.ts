import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { indicateursAARRI } from "$server/database/aarri.js";

export const GET: RequestHandler = async () => {
  return json(await indicateursAARRI());
};
