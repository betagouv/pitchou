import { formatFileSize } from "@pitchou/common/fileSize.ts";

/** Largest file the browser may send to storage, in bytes; the root layout sets it from the server. */
export const uploadLimit = $state<{ maxBytes: number | undefined }>({ maxBytes: undefined });

/** French UI hint like "Taille maximale par fichier : 1 Go." — empty when unknown. */
export function uploadSizeHint(): string {
  const { maxBytes } = uploadLimit;
  if (maxBytes === undefined || !Number.isFinite(maxBytes)) return "";
  return `Taille maximale par fichier : ${formatFileSize(maxBytes)}.`;
}

/** Error message when a file exceeds the limit, or null when every file fits (or the limit is unknown). */
export function uploadSizeError(files: File[]): string | null {
  const { maxBytes } = uploadLimit;
  if (maxBytes === undefined || !Number.isFinite(maxBytes)) return null;
  const tooLarge = files.find((file) => file.size > maxBytes);
  if (!tooLarge) return null;
  return `Le fichier ${tooLarge.name} est trop volumineux. ${uploadSizeHint()}`;
}
