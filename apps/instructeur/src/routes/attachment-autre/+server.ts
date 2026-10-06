import { error, json } from "@sveltejs/kit";

import { requireUserId, requireDossierAccess } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { parseUploadedFichiers, throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";
import { addOtherAttachment } from "@pitchou/server/database/other_attachment.ts";
import { logDossierActionsAfterCommit } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";

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

  await requireDossierAccess(dossier as Dossier["id"], userId);

  let ids: string[];
  try {
    ids = await addOtherAttachment({
      dossier: dossier as Dossier["id"],
      type: type.trim(),
      attachment_date: attachmentDateRaw ? new Date(attachmentDateRaw as string) : null,
      files,
    });
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }

  await logDossierActionsAfterCommit(
    (async () => {
      const author = await getUserById(userId);
      return files.map((file) => ({
        dossier: dossier as Dossier["id"],
        type: "piece_jointe_importee",
        data: { name: file.name, attachment_type: type.trim() },
        author_personne: author?.id ?? null,
      }));
    })(),
  );

  return json(ids);
};
