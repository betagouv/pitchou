import { json, error } from "@sveltejs/kit";
import { listDossierUserAccess, saveDossierUserAccess } from "@pitchou/server/administration.ts";
import { parseAccessLevel } from "@pitchou/common/groupRouting.ts";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { saveAdministration } from "#lib/server/administration.ts";
import { parseDossierId } from "#lib/server/dossierValidation.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) =>
  json(await saveAdministration(() => listDossierUserAccess(parseDossierId(params.dossierId))));

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const body = await readJsonObject(request);
  if (
    !Number.isSafeInteger(body.userId) ||
    Number(body.userId) < 1 ||
    body.accessLevel === undefined
  )
    error(400, "Accès utilisateur invalide");
  return json(
    await saveAdministration(() =>
      saveDossierUserAccess(
        locals.user!.id,
        parseDossierId(params.dossierId),
        Number(body.userId),
        body.accessLevel === null ? null : parseAccessLevel(body.accessLevel),
      ),
    ),
  );
};
