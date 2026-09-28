/** "1 Go" for whole gigabytes, "200 Mo" otherwise (Mo rounded down). */
export function formatFileSize(bytes: number): string {
  const mo = Math.floor(bytes / (1024 * 1024));
  return mo >= 1024 && mo % 1024 === 0 ? `${mo / 1024} Go` : `${mo} Mo`;
}
