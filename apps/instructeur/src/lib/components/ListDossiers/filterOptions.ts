import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import {
  departements as allDepartements,
  departementNameByCode,
} from "@pitchou/common/departements.ts";
import { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import type { ActiviteCode, DossiersContext } from "./query.ts";

export type DepartementOption = { code: string; name: string };

export type ActiviteOption = { code: ActiviteCode; label: string };

/**
 * The Pitchou activities present among the loaded dossiers, deduplicated by code so raw labels
 * renamed in DN over time count as one activity. Sorted by name, « Autre » last (catch-all).
 */
export function listAvailableActivites(dossiers: DossierSummary[]): ActiviteOption[] {
  const labelByCode = new Map<ActiviteCode, string>();
  for (const dossier of dossiers) {
    if (dossier.activite_code) {
      labelByCode.set(dossier.activite_code, dossier.activite_label ?? dossier.activite_code);
    }
  }
  return [...labelByCode]
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => {
      if (a.code === AUTRE_ACTIVITE_CODE) return 1;
      if (b.code === AUTRE_ACTIVITE_CODE) return -1;
      return a.label.localeCompare(b.label, "fr");
    });
}

/** Display names of the activities present among the dossiers, for chips and analytics. */
export function activiteLabelByCode(dossiers: DossierSummary[]): Map<ActiviteCode, string> {
  return new Map(listAvailableActivites(dossiers).map(({ code, label }) => [code, label]));
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
