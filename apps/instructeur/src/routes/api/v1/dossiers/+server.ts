import { json } from "@sveltejs/kit";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import { dossierReadScope } from "@pitchou/types/externalApi.ts";
import {
  listExternalDossiers,
  statusByPhase,
  type DossierListFilters,
} from "@pitchou/server/database/externalApi/dossiers.ts";
import { parseDossierId, withApiScope } from "#lib/server/externalApi/read.ts";
import { apiProblem } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

const listParameters = new Set(["after", "limit", "status", "department", "q", "followed"]);

function parseFilters(params: URLSearchParams): DossierListFilters | undefined {
  for (const name of params.keys()) if (!listParameters.has(name)) return;
  const after = params.get("after");
  const limit = params.get("limit") ?? "50";
  const status = params.get("status");
  const department = params.get("department")?.trim();
  const search = params.get("q")?.trim();
  const followed = params.get("followed");
  const phase = (Object.keys(statusByPhase) as DossierPhase[]).find(
    (entry) => statusByPhase[entry] === status,
  );
  const cursor = after === null ? 0 : parseDossierId(after);
  if (
    cursor === undefined ||
    !/^[1-9]\d{0,2}$/u.test(limit) ||
    Number(limit) > 100 ||
    (status !== null && !phase) ||
    (department !== undefined && !/^(?:\d{2,3}|2[AB])$/u.test(department)) ||
    (search && search.length > 200) ||
    (followed !== null && followed !== "true" && followed !== "false")
  )
    return;
  return {
    after: cursor,
    limit: Number(limit),
    phase,
    department,
    search,
    followed: followed === null ? undefined : followed === "true",
  };
}

export const GET: RequestHandler = ({ locals, url }) =>
  withApiScope(locals, dossierReadScope, async (principal) => {
    const filters = parseFilters(url.searchParams);
    if (!filters || (filters.followed !== undefined && principal.kind !== "personal"))
      return apiProblem(400, "Filtres de dossiers invalides");
    return json(await listExternalDossiers(principal, filters));
  });
