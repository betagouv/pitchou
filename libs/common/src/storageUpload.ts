import type { UploadUrl, UploadedFichier } from "@pitchou/types/API_Pitchou.ts";

/**
 * PUTs one file to a signed storage URL. fetch() cannot report upload
 * progress, hence XMLHttpRequest. The browser fills Content-Type from the
 * File's type, which storage then reports back to the server.
 */
export function putFileToStorage(
  url: string,
  file: File,
  onProgress: (loaded: number) => void,
): Promise<void> {
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
    xhr.send(file);
  });
}

/**
 * Sends `files` one by one to their signed URLs (same order), reporting the
 * overall fraction sent, and returns the references the API expects.
 */
export async function sendFilesToStorage(
  files: File[],
  urls: UploadUrl[],
  onProgress: (fraction: number) => void,
): Promise<UploadedFichier[]> {
  if (urls.length !== files.length) {
    throw new Error("Le serveur n'a pas renvoyé une URL par fichier.");
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  let sentBefore = 0;
  onProgress(0);
  for (const [index, file] of files.entries()) {
    await putFileToStorage(urls[index].url, file, (loaded) => {
      onProgress(total === 0 ? 1 : (sentBefore + loaded) / total);
    });
    sentBefore += file.size;
  }
  return files.map((file, index) => ({ id: urls[index].id, name: file.name }));
}

/** Splits `items` into consecutive groups of at most `size`. */
export function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    groups.push(items.slice(start, start + size));
  }
  return groups;
}
