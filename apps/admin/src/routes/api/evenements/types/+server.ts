import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { listEvenementMetriqueTypes } from "@pitchou/server/database/evenements_metriques.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  return json(await listEvenementMetriqueTypes());
};
