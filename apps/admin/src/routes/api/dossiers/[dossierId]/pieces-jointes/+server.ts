import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { addPieceJointeFromAdmin } from "@pitchou/server/database/dossier_admin_files.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const POST: RequestHandler = async ({ params, request }) => {
  const dossierId = parseDossierId(params.dossierId!);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    error(400, "Champ 'file' manquant ou vide.");
  }

  try {
    const stored = await addPieceJointeFromAdmin(dossierId, {
      name: file.name,
      media_type: file.type || null,
      content: Buffer.from(await file.arrayBuffer()),
    });
    return json(stored, { status: 201 });
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
