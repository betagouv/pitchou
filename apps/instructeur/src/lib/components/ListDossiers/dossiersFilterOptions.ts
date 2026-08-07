import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import {
  departements as allDepartements,
  departementNameByCode,
} from "@pitchou/common/departements.ts";
import type { ActivitePrincipale, DossiersContext } from "./dossiersQuery.ts";

export type DepartementOption = { code: string; name: string };

export function listAvailableActivites(dossiers: DossierSummary[]): ActivitePrincipale[] {
  const activites = new Set<ActivitePrincipale>();
  for (const dossier of dossiers) {
    if (dossier.main_activite) activites.add(dossier.main_activite);
  }
  return [...activites].sort((a, b) => a.localeCompare(b, "fr"));
}

export function listAvailableDepartements(dossiers: DossierSummary[]): DepartementOption[] {
  const presentCodes = new Set<string>();
  for (const dossier of dossiers) {
    for (const code of dossier.departments ?? []) presentCodes.add(code);
  }
  const unknownCodes = [...presentCodes]
    .filter((code) => !departementNameByCode.has(code))
    .map((code) => ({ code, name: code }));
  return [...allDepartements, ...unknownCodes].sort((a, b) =>
    a.code.localeCompare(b.code, "fr", { numeric: true }),
  );
}

export function listAvailableInstructeurs(
  followRelations: DossiersContext["followRelations"],
): string[] {
  if (!followRelations) return [];
  const emails: string[] = [];
  for (const [email, followedDossiers] of followRelations) {
    if (followedDossiers.size > 0) emails.push(email);
  }
  return emails.sort((a, b) => a.localeCompare(b, "fr"));
}
