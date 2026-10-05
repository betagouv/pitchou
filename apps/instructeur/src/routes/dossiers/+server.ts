import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { getDossiersSummariesForUser } from "@pitchou/server/database/dossier.ts";

export const GET: RequestHandler = async ({ locals }) => {
  const userId = requireUserId(locals);
  return json(await getDossiersSummariesForUser(userId));
};
