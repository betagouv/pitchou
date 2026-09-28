import { formatFileSize } from "@pitchou/common/fileSize.ts";
import { store } from "$lib/state/store.svelte.ts";

/** Upload size limit in Mo, or null when unknown or unlimited. */
export function maxUploadSizeMo(): number | null {
  const bytes = store.maxUploadSizeBytes;
  if (bytes === undefined || !Number.isFinite(bytes)) return null;
  return Math.floor(bytes / (1024 * 1024));
}

/**
 * French UI hint like "Taille maximale : 1 Go." — empty when the limit is
 * unknown or unlimited. Reads the store, so stays reactive in a template.
 */
export function uploadSizeHint(): string {
  const bytes = store.maxUploadSizeBytes;
  if (bytes === undefined || !Number.isFinite(bytes)) return "";
  return `Taille maximale : ${formatFileSize(bytes)}.`;
}

/**
 * French error message when a file in the list exceeds the upload size limit,
 * or null when everything fits (or the limit is unknown/unlimited). Lets the UI
 * reject an oversized file up front, before asking for a signed upload URL.
 */
export function uploadSizeError(files: FileList | File[]): string | null {
  const maxBytes = store.maxUploadSizeBytes;
  if (maxBytes === undefined || !Number.isFinite(maxBytes)) return null;
  const tooLarge = Array.from(files).some((file) => file.size > maxBytes);
  if (!tooLarge) return null;
  return `Fichier trop volumineux. ${uploadSizeHint()}`;
}
