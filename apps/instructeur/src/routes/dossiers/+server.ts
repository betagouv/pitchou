import type { RequestHandler } from "./$types";
import { requireUserId } from "#lib/server/auth.ts";
import { getDossiersSummariesForUser } from "@pitchou/server/database/dossier.ts";
import { dossierListResponse } from "@pitchou/server/dossierListResponse.ts";

export const GET: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  return dossierListResponse(
    await getDossiersSummariesForUser(userId),
    request.headers.get("accept-encoding"),
  );
};
