import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getEspecesProtegees } from "@pitchou/server/especeProtegee.ts";

export const GET: RequestHandler = async () => {
  return json(await getEspecesProtegees());
};
