import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import {
  deleteEspecesImpacteesFromAdmin,
  setEspecesImpacteesFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";
import { UploadedFichierError } from "@pitchou/server/upload.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";
import { validateSpeciesUpload } from "$lib/server/speciesUpload";
import { readSingleUpload, throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";

// Auth is enforced upstream by hooks.server.ts (session and permissions).
/** Sets the species spreadsheet from a file the browser sent to storage (`{ file: { id, name } }`). */
export const POST: RequestHandler = async ({ params, request }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const species = await validateSpeciesUpload(await readSingleUpload(request));

  try {
    const stored = await setEspecesImpacteesFromAdmin(dossierId, species);
    return json(stored, { status: 201 });
  } catch (err) {
    if (err instanceof UploadedFichierError) throwUploadedFichierHttpError(err);
    throwHttpErrorForAdminDossier(err);
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId!);

  try {
    const deleted = await deleteEspecesImpacteesFromAdmin(dossierId);
    if (!deleted) error(404, "No fichier especes impactees found for this dossier.");
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }

  return new Response(null, { status: 204 });
};
