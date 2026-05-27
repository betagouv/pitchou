import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getRésultatsSynchronisationDS88444 } from "$server/database.js";

export const GET: RequestHandler = async () => {
  return json(await getRésultatsSynchronisationDS88444());
};
