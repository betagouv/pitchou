import { randomUUID } from "node:crypto";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { createUploadUrl, pendingKey } from "@pitchou/server/objectStorage.ts";
import { getMaxUploadSizeBytes } from "@pitchou/server/uploadLimit.ts";
import type { UploadUrl } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const MAX_FILES_PER_REQUEST = 20;

function parseSizes(files: unknown): number[] {
  if (!Array.isArray(files) || files.length === 0) {
    error(400, "La propriété 'files' doit être une liste non vide.");
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    error(400, `Au maximum ${MAX_FILES_PER_REQUEST} fichiers par requête.`);
  }
  const maxSize = getMaxUploadSizeBytes();
  return files.map((file: unknown) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      error(400, "Chaque élément de 'files' doit être un objet.");
    }
    rejectUnknownProperties(file as Record<string, unknown>, new Set(["size"]));
    const { size } = file as Record<string, unknown>;
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
      error(400, "La propriété 'files[].size' doit être un entier strictement positif.");
    }
    if (size > maxSize) {
      error(413, "Fichier trop volumineux.");
    }
    return size;
  });
}

/**
 * Hands the browser one signed URL per file so it can PUT the bytes straight
 * into object storage. The objects land under `pending/` and only become files
 * once another endpoint registers them, so an unused URL costs nothing but a
 * short-lived object.
 */
export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["dossier", "files"]));

  if (typeof body.dossier !== "number" || !Number.isInteger(body.dossier)) {
    error(400, "La propriété 'dossier' doit être un nombre entier.");
  }
  const sizes = parseSizes(body.files);
  await requireDossierAccessByCap(body.dossier as DossierId, cap);

  const urls: UploadUrl[] = await Promise.all(
    sizes.map(async (size) => {
      const id = randomUUID() as FileId;
      return { id, url: await createUploadUrl(pendingKey(id), size) };
    }),
  );
  return json(urls);
};
