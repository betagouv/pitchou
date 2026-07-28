import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import {
  deleteDossierFromAdmin,
  updateDossierFromAdmin,
} from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import { readJsonObject } from "$lib/server/requestValidation";
import {
  parseDossierId,
  parseDossierUpdate,
  throwHttpErrorForAdminDossier,
} from "$lib/server/dossierValidation";

// 23505 = unique_violation in PostgreSQL (duplicate phase event).
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId!);

  try {
    return json(await getDossierDetailForAdmin(dossierId));
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const update = parseDossierUpdate(await readJsonObject(request));

  try {
    await updateDossierFromAdmin(dossierId, update, locals.user!.email);
  } catch (err) {
    if (isUniqueViolation(err)) {
      error(409, "Un évènement de phase identique existe déjà pour ce dossier.");
    }
    throwHttpErrorForAdminDossier(err);
  }

  return json(await getDossierDetailForAdmin(dossierId));
};

export const DELETE: RequestHandler = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId!);

  try {
    await deleteDossierFromAdmin(dossierId);
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }

  return new Response(null, { status: 204 });
};
