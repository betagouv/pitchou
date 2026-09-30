import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { addPieceJointeFromAdmin } from "@pitchou/server/database/dossier_admin_files.ts";
import { UploadedFichierError } from "@pitchou/server/upload.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";
import { readSingleUpload, throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
/** Attaches a file the browser already sent to object storage (`{ file: { id, name } }`). */
export const POST: RequestHandler = async ({ params, request }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const upload = await readSingleUpload(request);

  try {
    const stored = await addPieceJointeFromAdmin(dossierId, upload);
    return json(stored, { status: 201 });
  } catch (err) {
    if (err instanceof UploadedFichierError) throwUploadedFichierHttpError(err);
    throwHttpErrorForAdminDossier(err);
  }
};
