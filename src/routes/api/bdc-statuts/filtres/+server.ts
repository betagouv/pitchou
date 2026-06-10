import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getBdcStatutFiltres } from "$lib/server/bdcStatut.ts";

export const GET: RequestHandler = async () => {
  return json(await getBdcStatutFiltres());
};
