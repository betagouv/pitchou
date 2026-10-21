/** Format bytes in French units, rounding down to whole units. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.floor(bytes / 1024)} Ko`;
  const mo = Math.floor(bytes / (1024 * 1024));
  return mo >= 1024 && mo % 1024 === 0 ? `${mo / 1024} Go` : `${mo} Mo`;
}
