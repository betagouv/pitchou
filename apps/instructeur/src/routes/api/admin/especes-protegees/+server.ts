import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAdmin } from "$lib/server/auth.ts";
import { getEspecesProtegees } from "$lib/server/especeProtegee.ts";

export const GET: RequestHandler = async ({ url }) => {
  await requireAdmin(url);
  return json(await getEspecesProtegees());
};
