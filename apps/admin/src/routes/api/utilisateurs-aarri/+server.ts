import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getUtilisateursAARRI } from "@pitchou/server/database/utilisateursAARRI.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  return json(await getUtilisateursAARRI());
};
