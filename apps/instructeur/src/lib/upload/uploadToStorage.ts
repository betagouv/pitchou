import { store } from "$lib/state/store.svelte.ts";
import { uploadProgress } from "./uploadProgress.svelte.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

/**
 * Sends `files` straight to object storage through signed URLs, so the bytes
 * never go through the app server and its request body limit. Returns the
 * references the API expects in place of the file contents.
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

  const urls = await createUploadUrls({
    dossier: dossierId,
    files: files.map((file) => ({ size: file.size })),
  });

  const total = files.reduce((sum, file) => sum + file.size, 0);
  let sentBefore = 0;
  uploadProgress.fraction = 0;
  try {
    for (const [index, file] of files.entries()) {
      await putFile(urls[index].url, file, (loaded) => {
        uploadProgress.fraction = total === 0 ? 1 : (sentBefore + loaded) / total;
      });
      sentBefore += file.size;
    }
  } finally {
    uploadProgress.fraction = null;
  }

  return files.map((file, index) => ({ id: urls[index].id, name: file.name }));
}

/** fetch() cannot report upload progress, hence XMLHttpRequest. */
function putFile(url: string, file: File, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
      } else {
        reject(new Error(`L'envoi du fichier ${file.name} a échoué (${xhr.status}).`));
      }
    });
    xhr.addEventListener("error", () => {
      reject(new Error(`L'envoi du fichier ${file.name} a échoué (erreur réseau).`));
    });
    xhr.addEventListener("abort", () => {
      reject(new Error(`L'envoi du fichier ${file.name} a été interrompu.`));
    });
    // The browser fills Content-Type from the File's type.
    xhr.send(file);
  });
}
