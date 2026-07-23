import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getEspecesProtegees } from "@pitchou/server/especeProtegee.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  return json(await getEspecesProtegees());
};
