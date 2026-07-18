import { error, json } from "@sveltejs/kit";

import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { addAttachmentAutre } from "@pitchou/server/database/attachment_autre.ts";

import type { RequestHandler } from "./$types";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

async function readFileField(file: File) {
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
