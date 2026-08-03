import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { assertSpeciesSpreadsheet } from "@pitchou/common/especesUtils.ts";
import {
  deleteEspecesImpacteesFromAdmin,
  setEspecesImpacteesFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";
import { speciesFileError, speciesFileMediaType } from "$lib/speciesFile.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const POST: RequestHandler = async ({ params, request }) => {
  const dossierId = parseDossierId(params.dossierId!);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    error(400, "Champ 'file' manquant ou vide.");
  }
  const fileError = speciesFileError(file);
  if (fileError) error(400, fileError);
  const content = await file.arrayBuffer();
  try {
    await assertSpeciesSpreadsheet(content);
  } catch (validationError) {
    error(
      400,
      validationError instanceof Error ? validationError.message : "Le tableur n'est pas valide.",
    );
  }

  try {
    const stored = await setEspecesImpacteesFromAdmin(dossierId, {
      name: file.name,
      media_type: speciesFileMediaType(file.name),
      content: Buffer.from(content),
    });
    return json(stored, { status: 201 });
  } catch (err) {
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
