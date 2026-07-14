import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getResultatsSynchronisationDS88444 } from "@pitchou/server/database.ts";

export const GET: RequestHandler = async () => {
  return json(await getResultatsSynchronisationDS88444());
};
