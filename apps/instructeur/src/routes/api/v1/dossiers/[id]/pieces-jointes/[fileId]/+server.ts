import { isHttpError } from "@sveltejs/kit";
import { findFichierAttachments } from "@pitchou/server/database/fichier_access.ts";
import { isFichierSharedInReadOnly } from "@pitchou/server/database/dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { downloadFichierResponse } from "#lib/server/fichier.ts";
import { withDossierRead } from "#lib/server/externalApi/read.ts";
import { apiNotFound } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params, request }) =>
  withDossierRead(locals, params.id, async (id, internal, trx) => {
    const file = params.fileId as FileId;
    const attachments = await findFichierAttachments(file, trx);
    if (
      !attachments.some(
        (edge) => edge.dossier === id && (internal || isFichierSharedInReadOnly(edge)),
      )
    )
      return apiNotFound();
    try {
      return await downloadFichierResponse(file, { headOnly: request.method === "HEAD", db: trx });
    } catch (error) {
      if (isHttpError(error, 404)) return apiNotFound();
      throw error;
    }
  });
