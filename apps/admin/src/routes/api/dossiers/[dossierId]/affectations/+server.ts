import { json, error } from "@sveltejs/kit";
import { listDossierAssignments, saveDossierAssignment } from "@pitchou/server/administration.ts";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { saveAdministration } from "#lib/server/administration.ts";
import { parseDossierId } from "#lib/server/dossierValidation.ts";
import type { AssignmentMode } from "@pitchou/types/groupRouting.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) =>
  json(await saveAdministration(() => listDossierAssignments(parseDossierId(params.dossierId))));
export const POST: RequestHandler = async ({ params, request, locals }) => {
  const body = await readJsonObject(request);
  if (
    typeof body.groupId !== "string" ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(body.groupId) ||
    !["auto", "include", "exclude"].includes(String(body.mode))
  )
    error(400, "Affectation invalide");
  return json(
    await saveAdministration(() =>
      saveDossierAssignment(
        locals.user!.id,
        parseDossierId(params.dossierId),
        body.groupId as string,
        body.mode as AssignmentMode,
      ),
    ),
  );
};
