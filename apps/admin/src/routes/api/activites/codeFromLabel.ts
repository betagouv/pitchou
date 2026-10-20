/**
 * Derives a stable activity code from its display name: lowercase, accents stripped, words
 * joined by dashes — the same shape as the historical codes ("carrieres", "gestion-eau", …).
 */
export function activiteCodeFromLabel(label: string): string {
  return label
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}
