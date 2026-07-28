import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { phases } from "@pitchou/common/phases.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import {
  listDossiersForAdmin,
  type ListAdminDossiersOptions,
} from "@pitchou/server/database/dossier_admin_list.ts";
import { readJsonObject } from "$lib/server/requestValidation";
import { parseDossierCreation, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

function parsePhaseFilter(value: string | null): DossierPhase | undefined {
  if (!value) return undefined;
  if (!phases.has(value as DossierPhase)) {
    error(400, `Phase inconnue : '${value}'.`);
  }
  return value as DossierPhase;
}

function parseSourceFilter(value: string | null): ListAdminDossiersOptions["source"] {
  if (!value) return undefined;
  if (value !== "pitchou" && value !== "dn") {
    error(400, `Source inconnue : '${value}' (attendu : 'pitchou' ou 'dn').`);
  }
  return value;
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async ({ url }) => {
  const params = url.searchParams;

  const { dossiers, total } = await listDossiersForAdmin({
    page: Number(params.get("page")) || 1,
    pageSize: Number(params.get("pageSize")) || 50,
    search: params.get("search") ?? undefined,
    phase: parsePhaseFilter(params.get("phase")),
    source: parseSourceFilter(params.get("source")),
  });

  return json({ dossiers, total });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const creation = parseDossierCreation(await readJsonObject(request));

  try {
    const { id } = await createDossierFromAdmin(creation, locals.user!.email);
    return json({ id }, { status: 201 });
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
