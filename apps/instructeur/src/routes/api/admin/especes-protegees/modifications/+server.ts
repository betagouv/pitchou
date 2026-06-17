import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAdmin } from "$lib/server/auth.ts";
import { listEspeceProtegeeModifications } from "@pitchou/server/especeProtegee.ts";

export const GET: RequestHandler = async ({ url }) => {
  await requireAdmin(url);
  return json(await listEspeceProtegeeModifications());
};
