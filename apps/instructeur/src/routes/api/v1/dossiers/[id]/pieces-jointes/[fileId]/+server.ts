import { getFile } from "@pitchou/server/database/file.ts";
import { findFichierAttachments } from "@pitchou/server/database/fichier_access.ts";
import { isFichierSharedInReadOnly } from "@pitchou/server/database/dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { downloadStoredFichierResponse } from "#lib/server/fichier.ts";
import { withDossierRead } from "#lib/server/externalApi/read.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params, request }) =>
  withDossierRead(
    locals,
    params.id,
    async (id, internal, trx) => {
      const file = params.fileId as FileId;
      const attachments = await findFichierAttachments(file, trx);
      if (
        !attachments.some(
          (edge) => edge.dossier === id && (internal || isFichierSharedInReadOnly(edge)),
        )
      )
        return;
      return getFile(file, trx);
    },
    (file) => downloadStoredFichierResponse(file, request.method === "HEAD"),
  );
