import { error, json } from "@sveltejs/kit";

import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { addAttachmentAutre } from "@pitchou/server/database/attachmentAutre.ts";

import type { RequestHandler } from "./$types";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const ONE_MB = 1_048_576;
const MAX_UPLOAD_FILE_SIZE = 500 * ONE_MB;

async function readFileField(file: File) {
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    error(413, `Fichier '${file.name}' trop volumineux (max ${MAX_UPLOAD_FILE_SIZE} octets)`);
  }

  return {
    nom: file.name,
    media_type: file.type || null,
    contenu: Buffer.from(await file.arrayBuffer()),
  };
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const form = await request.formData();

  const dossierRaw = form.get("dossier");
  const type = form.get("type");
  const attachmentDateRaw = form.get("attachment_date");

  if (typeof dossierRaw !== "string") {
    error(400, `Champ 'dossier' manquant`);
  }
  if (typeof type !== "string" || type.trim() === "") {
    error(400, `Champ 'type' manquant`);
  }

  const dossier = JSON.parse(dossierRaw) as Dossier["id"];
  await requireDossierAccessByCap(dossier, cap);

  const files = await Promise.all(
    form.getAll("files").flatMap((file) => (file instanceof File ? [readFileField(file)] : [])),
  );
  if (files.length === 0) {
    error(400, `Aucun fichier fourni`);
  }

  const ids = await addAttachmentAutre({
    dossier,
    type: type.trim(),
    attachment_date:
      typeof attachmentDateRaw === "string" && attachmentDateRaw
        ? new Date(attachmentDateRaw)
        : null,
    files,
  });

  return json(ids);
};
