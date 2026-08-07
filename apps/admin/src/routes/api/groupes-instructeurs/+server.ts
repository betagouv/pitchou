import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { listGroupesInstructeursForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  return json(await listGroupesInstructeursForAdmin());
};
