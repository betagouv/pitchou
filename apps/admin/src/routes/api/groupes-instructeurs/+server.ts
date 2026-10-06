import { readJsonObject } from "$lib/server/requestValidation.ts";
import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { listGroupesInstructeursForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

// Auth is enforced upstream by hooks.server.ts (session and permissions).
export const GET: RequestHandler = async () => {
  return json(await listGroupesInstructeursForAdmin());
};

import { saveGroup } from "@pitchou/server/administration.ts";
import { parseGroup, saveAdministration } from "$lib/server/administration.ts";
export const POST: RequestHandler = async ({ request, locals }) =>
  json(
    await saveAdministration(async () =>
      saveGroup(locals.user!.id, parseGroup(await readJsonObject(request))),
    ),
  );
