import { error, json } from "@sveltejs/kit";

import { requireUserId, requireDossierWriteAccess } from "#lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "#lib/server/requestValidation.ts";
import {
  parseUploadedFichiers,
  throwUploadedFichierHttpError,
} from "#lib/server/uploadedFichier.ts";
import { addOtherAttachment } from "@pitchou/server/database/other_attachment.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";

import type { RequestHandler } from "./$types";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const attachmentProperties = new Set(["dossier", "type", "attachment_date", "files"]);

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = requireUserId(locals);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, attachmentProperties);

  const { dossier, type, attachment_date: attachmentDateRaw } = body;
  if (typeof dossier !== "number" || !Number.isInteger(dossier)) {
    error(400, `La propriété 'dossier' doit être un nombre entier.`);
  }
  if (typeof type !== "string" || type.trim() === "") {
    error(400, `Champ 'type' manquant`);
  }
  if (
    attachmentDateRaw !== undefined &&
    attachmentDateRaw !== null &&
    (typeof attachmentDateRaw !== "string" || Number.isNaN(Date.parse(attachmentDateRaw)))
  ) {
    error(400, `La propriété 'attachment_date' doit être une date valide ou null.`);
  }
  const files = parseUploadedFichiers(body.files, "files");
  if (files.length === 0) {
    error(400, `Aucun fichier fourni`);
  }

  const ids = await directDatabaseConnection.transaction(async (transaction) => {
    await requireDossierWriteAccess(dossier as Dossier["id"], userId, transaction);
    let ids: string[];
    try {
      ids = await addOtherAttachment(
        {
          dossier: dossier as Dossier["id"],
          type: type.trim(),
          attachment_date: attachmentDateRaw ? new Date(attachmentDateRaw as string) : null,
          files,
        },
        transaction,
      );
    } catch (err) {
      throwUploadedFichierHttpError(err);
    }
    await logDossierActions(
      files.map((file) => ({
        dossier: dossier as Dossier["id"],
        type: "piece_jointe_importee",
        data: { name: file.name, attachment_type: type.trim() },
        author_personne: userId,
      })),
      transaction,
    );
    return ids;
  });
  return json(ids);
};
