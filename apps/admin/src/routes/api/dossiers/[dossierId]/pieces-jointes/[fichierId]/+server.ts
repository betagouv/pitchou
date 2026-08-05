import { error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { deletePieceJointeFromAdmin } from "@pitchou/server/database/dossier_admin_files.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

import type { FileId } from "@pitchou/types/database/public/File.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const DELETE: RequestHandler = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const fichierId = params.fichierId! as FileId;

  try {
    const deletedEdges = await deletePieceJointeFromAdmin(dossierId, fichierId);
    if (deletedEdges === 0) {
      error(404, "Pièce jointe introuvable pour ce dossier.");
    }
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }

  return new Response(null, { status: 204 });
};
