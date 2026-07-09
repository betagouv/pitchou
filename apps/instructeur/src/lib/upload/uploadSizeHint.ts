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
