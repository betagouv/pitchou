import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getTaxrefFiltres } from "$lib/server/taxref.ts";

export const GET: RequestHandler = async () => {
  return json(await getTaxrefFiltres());
};
