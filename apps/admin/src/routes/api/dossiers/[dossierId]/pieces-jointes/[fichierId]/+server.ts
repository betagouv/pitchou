import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { deletePieceJointeFromAdmin } from "@pitchou/server/database/dossier_admin_files.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "#lib/server/dossierValidation.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";

// Auth is enforced upstream by hooks.server.ts (session and permissions).
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const fichierId = params.fichierId! as FileId;

  try {
    const deletedEdges = await withAdminWriteAccess(locals, "admin:dossiers:files", (trx) =>
      deletePieceJointeFromAdmin(dossierId, fichierId, trx),
    );
    if (deletedEdges === 0) {
      error(404, "Pièce jointe introuvable pour ce dossier.");
    }
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }

  return new Response(null, { status: 204 });
};
