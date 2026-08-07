export const dossierSources = ["unknown", "pitchou", "demarche_numerique"] as const;

export type DossierSource = (typeof dossierSources)[number];

export function isDossierSource(value: unknown): value is DossierSource {
  return dossierSources.includes(value as DossierSource);
}
