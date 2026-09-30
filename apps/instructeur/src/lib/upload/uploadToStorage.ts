import { chunk, sendFilesToStorage } from "@pitchou/common/storageUpload.ts";
import { store } from "$lib/state/store.svelte.ts";
import { uploadProgress } from "./uploadProgress.svelte.ts";
import type { UploadUrl, UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

/** The server signs at most this many URLs per request. */
const URLS_PER_REQUEST = 20;

/**
 * Sends `files` straight to object storage through signed URLs, so the bytes
 * never go through the app server. Returns the references the API expects in
 * place of the file contents.
 */
export async function uploadFichiers(
  dossierId: Dossier["id"],
  files: File[],
): Promise<UploadedFichier[]> {
  if (files.length === 0) return [];
  const createUploadUrls = store.capabilities.createUploadUrls;
  if (!createUploadUrls) {
    throw new Error(`Pas les droits suffisants pour envoyer des fichiers`);
  }

  const urls: UploadUrl[] = [];
  for (const group of chunk(files, URLS_PER_REQUEST)) {
    urls.push(
      ...(await createUploadUrls({
        dossier: dossierId,
        files: group.map((file) => ({ size: file.size })),
      })),
    );
  }

  try {
    return await sendFilesToStorage(files, urls, (fraction) => {
      uploadProgress.fraction = fraction;
    });
  } finally {
    uploadProgress.fraction = null;
  }
}
