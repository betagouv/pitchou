import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import {
  departements as allDepartements,
  departementNameByCode,
} from "@pitchou/common/departements.ts";
import { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import {
  activiteSelectEntries,
  type ActiviteForSelect,
  type ActiviteGroupeForSelect,
} from "@pitchou/ui/activites/activiteSelectEntries.ts";
import type { SelectEntry } from "@pitchou/ui/Select/options.ts";
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
    if (dossier.activite_code === AUTRE_ACTIVITE_CODE) {
      // The catch-all also carries dossiers whose raw label is pending review and displayed
      // unchanged; the filter option keeps the activity name.
      labelByCode.set(dossier.activite_code, "Autre");
    } else if (dossier.activite_code) {
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

/** The parts of the activity referentiel (served by /api/activites) the filters need. */
export type ActiviteReferentielLite = {
  groupes: ActiviteGroupeForSelect[];
  activites: ActiviteForSelect[];
};

/**
 * Entries of the activity filter: the activities present among the loaded dossiers, grouped
 * under colored group headers with their icon. Falls back to a flat list while the referentiel
 * has not loaded; activities the referentiel does not know are kept as loose options.
 */
export function activiteFilterEntries(
  dossiers: DossierSummary[],
  referentiel: ActiviteReferentielLite | null,
): SelectEntry<string>[] {
  const available = listAvailableActivites(dossiers);
  if (!referentiel) return available.map(({ code, label }) => ({ value: code, label }));

  const availableCodes = new Set<string>(available.map(({ code }) => code));
  const grouped = activiteSelectEntries(
    referentiel.activites.filter(({ code }) => availableCodes.has(code)),
    referentiel.groupes,
  );
  const knownCodes = new Set(referentiel.activites.map(({ code }) => code));
  const loose = available
    .filter(({ code }) => !knownCodes.has(code))
    .map(({ code, label }) => ({ value: code as string, label }));
  return [...grouped, ...loose];
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
