import { store } from "$lib/state/store.svelte.ts";

/** Upload size limit in Mo, or null when unknown or unlimited. */
export function maxUploadSizeMo(): number | null {
  const octets = store.maxUploadSizeBytes;
  if (octets === undefined || !Number.isFinite(octets)) return null;
  return Math.floor(octets / (1024 * 1024));
}

/**
 * French UI hint like "Taille maximale : 200 Mo." — empty when the limit is
 * unknown or unlimited. Reads the store, so stays reactive in a template.
 */
export function uploadSizeHint(): string {
  const mo = maxUploadSizeMo();
  return mo === null ? "" : `Taille maximale\u00A0: ${mo} Mo.`;
}

/**
 * French error message when a file in the list exceeds the upload size limit,
 * or null when everything fits (or the limit is unknown/unlimited). Lets the UI
 * reject an oversized file up front, instead of the raw 413 the platform proxy
 * returns once the request is too big to reach the app.
 */
export function uploadSizeError(files: FileList | File[]): string | null {
  const maxBytes = store.maxUploadSizeBytes;
  if (maxBytes === undefined || !Number.isFinite(maxBytes)) return null;
  const tooLarge = Array.from(files).some((file) => file.size > maxBytes);
  if (!tooLarge) return null;
  return `Fichier trop volumineux. ${uploadSizeHint()}`;
}
