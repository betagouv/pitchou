const ACCEPTED_EXTENSIONS = new Set(["ods", "xlsx"]);

/**
 * Checks the name and, when known, the size of a species spreadsheet. The
 * browser passes its File; the server only knows the name at that point.
 */
export function speciesFileError(file: { name: string; size?: number }): string | null {
  if (file.size === 0) return "Le fichier est vide.";
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
    return "Le fichier doit être un tableur au format ODS ou XLSX.";
  }
  return null;
}

export function speciesFileMediaType(name: string): string {
  return name.toLowerCase().endsWith(".ods")
    ? "application/vnd.oasis.opendocument.spreadsheet"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
