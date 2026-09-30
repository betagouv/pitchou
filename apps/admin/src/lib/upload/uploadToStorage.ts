import { chunk, sendFilesToStorage } from "@pitchou/common/storageUpload.ts";
import { checkResponse } from "$lib/actions/adminResponse.ts";
import { uploadProgress } from "./uploadProgress.svelte.ts";
import type { UploadUrl, UploadedFichier } from "@pitchou/types/API_Pitchou.ts";

/** The server signs at most this many URLs per request. */
const URLS_PER_REQUEST = 20;

async function createUploadUrls(files: File[]): Promise<UploadUrl[]> {
  const response = await fetch("/api/fichiers/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: files.map((file) => ({ size: file.size })) }),
  });
  await checkResponse(response, "de la préparation de l'envoi des fichiers");
  return (await response.json()) as UploadUrl[];
}

/**
 * Sends `files` straight to object storage through signed URLs, so the bytes
 * never go through the app server. Returns the references the API expects in
 * place of the file contents, in the same order.
 */
export async function uploadFichiers(files: File[]): Promise<UploadedFichier[]> {
  if (files.length === 0) return [];
  const urls: UploadUrl[] = [];
  for (const group of chunk(files, URLS_PER_REQUEST)) {
    urls.push(...(await createUploadUrls(group)));
  }
  try {
    return await sendFilesToStorage(files, urls, (fraction) => {
      uploadProgress.fraction = fraction;
    });
  } finally {
    uploadProgress.fraction = null;
  }
}
