export const dossierSources = [
  "unknown",
  "pitchou",
  "demarche_numerique",
  // Import platforms: dossiers brought into Pitchou from another tool.
  "gunenv",
  "onagre",
  "import_fichier",
] as const;

export type DossierSource = (typeof dossierSources)[number];

export type DossierSourceFilter = "" | "onagre" | "demarche_numerique";

export function readDossierSourceFilter(value: unknown): DossierSourceFilter {
  return value === "onagre" || value === "demarche_numerique" ? value : "";
}

export function isDossierSource(value: unknown): value is DossierSource {
  return dossierSources.includes(value as DossierSource);
}
