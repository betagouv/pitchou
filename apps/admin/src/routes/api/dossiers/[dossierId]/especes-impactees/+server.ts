import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import {
  deleteEspecesImpacteesFromAdmin,
  setEspecesImpacteesFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";
import { UploadedFichierError } from "@pitchou/server/upload.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "#lib/server/dossierValidation.ts";
import { validateSpeciesUpload } from "#lib/server/speciesUpload.ts";
import { readSingleUpload, throwUploadedFichierHttpError } from "#lib/server/uploadedFichier.ts";

// Auth is enforced upstream by hooks.server.ts (session and permissions).
/** Sets the species spreadsheet from a file the browser sent to storage (`{ file: { id, name } }`). */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const species = await validateSpeciesUpload(await readSingleUpload(request));

  try {
    const stored = await withAdminWriteAccess(locals, "admin:dossiers:species", (trx) =>
      setEspecesImpacteesFromAdmin(dossierId, species, trx),
    );
    return json(stored, { status: 201 });
  } catch (err) {
    if (err instanceof UploadedFichierError) throwUploadedFichierHttpError(err);
    throwHttpErrorForAdminDossier(err);
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const dossierId = parseDossierId(params.dossierId!);

  try {
    const deleted = await withAdminWriteAccess(locals, "admin:dossiers:species", (trx) =>
      deleteEspecesImpacteesFromAdmin(dossierId, trx),
    );
    if (!deleted) error(404, "No fichier especes impactees found for this dossier.");
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }

  return new Response(null, { status: 204 });
};
