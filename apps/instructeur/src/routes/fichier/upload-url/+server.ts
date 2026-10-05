import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierAccess } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";
import { createUploadUrls, parseUploadSizes } from "@pitchou/server/upload.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

/**
 * Hands the browser one signed URL per file so it can PUT the bytes straight
 * into object storage. The upload is only allowed to someone instructing the
 * dossier; the file itself gets attached by a later, separately checked request.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = requireUserId(locals);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["dossier", "files"]));

  if (typeof body.dossier !== "number" || !Number.isInteger(body.dossier)) {
    error(400, "La propriété 'dossier' doit être un nombre entier.");
  }
  let sizes: number[];
  try {
    sizes = parseUploadSizes(body.files);
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }
  await requireDossierAccess(body.dossier as DossierId, userId);

  return json(await createUploadUrls(sizes));
};
