import type { RequestHandler } from "./$types";
import { requireUserId } from "#lib/server/auth.ts";
import { dossierListScope } from "#lib/server/dossierListRequest.ts";
import { getDossiersListPage } from "@pitchou/server/database/dossier/list.ts";
import { dossierListResponse } from "@pitchou/server/dossierListResponse.ts";

export const GET: RequestHandler = async ({ locals, url, request }) => {
  const userId = requireUserId(locals);
  const scope = dossierListScope(url.searchParams);
  const page = await getDossiersListPage(userId, url.searchParams, scope);
  return dossierListResponse(page, request.headers.get("accept-encoding"));
};
