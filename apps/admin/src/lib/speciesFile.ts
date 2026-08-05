export const MAX_SPECIES_FILE_SIZE = 65 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set(["ods", "xlsx"]);

export function speciesFileError(file: Pick<File, "name" | "size">): string | null {
  if (file.size === 0) return "Le fichier est vide.";
  if (file.size > MAX_SPECIES_FILE_SIZE) return "Le fichier ne doit pas dépasser 65 Mo.";
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
