import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { removeAccents } from "@pitchou/common/stringManipulation.ts";
import { dossierMatchesSearch, searchTerms } from "./dossiersSearch.ts";
import {
  departements as allDepartements,
  departementNameByCode,
} from "@pitchou/common/departements.ts";
import {
  WITHOUT_INSTRUCTEUR,
  defaultDossiersQuery,
  type ActivitePrincipale,
  type DateField,
  type DossiersContext,
  type DossiersQuery,
} from "./dossiersQuery.ts";

/** Experts whose avis is treated as a « CNPN/CSRPN » avis (the « Autre expert » avis is ignored) */
const AVIS_CNPN_CSRPN_EXPERTS = new Set(["CSRPN", "CNPN", "Ministre"]);

/** True when the dossier is followed by at least one person */
function dossierIsFollowed(
  dossierId: DossierSummary["id"],
  followRelations: DossiersContext["followRelations"],
): boolean {
  if (!followRelations) return false;
  for (const followedDossiers of followRelations.values()) {
    if (followedDossiers.has(dossierId)) return true;
  }
  return false;
}

/** Dossier date matching the field chosen in the « dates » filter */
export function dossierDate(
  dossier: DossierSummary,
  field: DateField,
  notificationByDossier: DossiersContext["notificationByDossier"],
): Date | undefined {
  switch (field) {
    case "phaseStart":
      return dossier.phase_start_date ?? undefined;
    case "lastModified":
      return notificationByDossier.get(dossier.id)?.updated_at ?? undefined;
    case "deposit":
    default:
      return dossier.depot_date ?? undefined;
  }
}

/** Applies the text search and every active filter of `query` */
export function filterDossiers(
  dossiers: DossierSummary[],
  query: DossiersQuery,
  ctx: DossiersContext,
): DossierSummary[] {
  const { notificationByDossier, followRelations } = ctx;
  let result = dossiers;

  if (query.text.trim()) {
    const terms = searchTerms(query.text);
    result = result.filter((dossier) => dossierMatchesSearch(dossier, terms, ctx));
  }
  if (query.phase.length) {
    result = result.filter((dossier) => query.phase.includes(dossier.phase));
  }
  if (query.activite.length) {
    result = result.filter(
      (dossier) => dossier.main_activite !== null && query.activite.includes(dossier.main_activite),
    );
  }
  if (query.actionInstructeur) {
    result = result.filter((dossier) => dossier.next_action_expected_from === "Instructeur");
  }
  if (query.prochaineAction.length) {
    const selected = query.prochaineAction as readonly string[];
    result = result.filter(
      (dossier) =>
        dossier.next_action_expected_from !== null &&
        selected.includes(dossier.next_action_expected_from),
    );
  }
  if (query.departement.length) {
    result = result.filter(
      (dossier) => dossier.departments?.some((code) => query.departement.includes(code)) ?? false,
    );
  }
  if (query.instructeur.length) {
    // « sans instructeur » and named instructeurs combine with OR: keep dossiers that are
    // unfollowed and/or followed by any of the selected people.
    const includesWithoutInstructeur = query.instructeur.includes(WITHOUT_INSTRUCTEUR);
    const selectedEmails = query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR);
    result = result.filter((dossier) => {
      if (includesWithoutInstructeur && !dossierIsFollowed(dossier.id, followRelations))
        return true;
      return selectedEmails.some((email) => followRelations?.get(email)?.has(dossier.id) ?? false);
    });
  }
  if (query.nouveaute === "oui") {
    result = result.filter((dossier) => notificationByDossier.get(dossier.id)?.viewed === false);
  } else if (query.nouveaute === "non") {
    result = result.filter((dossier) => notificationByDossier.get(dossier.id)?.viewed !== false);
  }
  if (query.enjeu) {
    result = result.filter((dossier) => dossier.enjeu === true);
  }
  if (query.decisionText.trim()) {
    const needle = removeAccents(query.decisionText.trim()).toLowerCase();
    result = result.filter((dossier) =>
      (dossier.decisionsAdministratives ?? []).some(
        (decision) =>
          decision.number != null && removeAccents(decision.number).toLowerCase().includes(needle),
      ),
    );
  }
  if (query.decisionAbsente) {
    // « non renseignée » = no décision administrative has an attached file.
    result = result.filter(
      (dossier) => !(dossier.decisionsAdministratives ?? []).some((decision) => decision.hasFile),
    );
  }
  if (query.avisExpertManquant) {
    // « non renseigné » = no CNPN/CSRPN/Ministre avis has an attached avis file.
    result = result.filter(
      (dossier) =>
        !(dossier.avisExperts ?? []).some(
          (avis) =>
            avis.expert !== null && AVIS_CNPN_CSRPN_EXPERTS.has(avis.expert) && avis.hasAvisFile,
        ),
    );
  }
  if (query.especesImpacteesAbsente) {
    result = result.filter((dossier) => !dossier.especesImpacteesRenseignees);
  }
  if (query.dateStart || query.dateEnd) {
    const start = query.dateStart ? new Date(`${query.dateStart}T00:00:00`) : undefined;
    const end = query.dateEnd ? new Date(`${query.dateEnd}T23:59:59.999`) : undefined;
    result = result.filter((dossier) => {
      const date = dossierDate(dossier, query.dateField, notificationByDossier);
      if (!date) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }

  return result;
}

export type DepartementOption = { code: string; name: string };

/** Activités principales present in the dossiers, sorted alphabetically */
export function listAvailableActivites(dossiers: DossierSummary[]): ActivitePrincipale[] {
  const activites = new Set<ActivitePrincipale>();
  for (const dossier of dossiers) {
    if (dossier.main_activite) activites.add(dossier.main_activite);
  }
  return [...activites].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Full list of départements (code + name) offered to the filter.
 * Starts from the official list and adds codes present in the dossiers but missing
 * from it, so that no dossier becomes impossible to filter.
 */
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

/** Instructeurs following at least one dossier, identified by email, sorted alphabetically */
export function listAvailableInstructeurs(
  followRelations: DossiersContext["followRelations"],
): string[] {
  if (!followRelations) return [];
  const emails: string[] = [];
  for (const [instructeurEmail, followedDossiers] of followRelations) {
    if (followedDossiers.size > 0) emails.push(instructeurEmail);
  }
  return emails.sort((a, b) => a.localeCompare(b, "fr"));
}

/** URL param keys driven by the Filtrer panel (text search, sort and page excluded) */
const FILTER_PARAM_KEYS = [
  "phase",
  "activite",
  "action",
  "departement",
  "instructeur",
  "nouveaute",
  "actionInstructeur",
  "enjeu",
  "decision",
  "decisionAbsente",
  "avisManquant",
  "especesAbsente",
  "dateField",
  "from",
  "to",
] as const;

/** Updates that clear every Filtrer-panel filter; text search, sort and page are left untouched */
export function buildClearFiltersUpdates(): Record<string, null> {
  return Object.fromEntries(FILTER_PARAM_KEYS.map((key) => [key, null]));
}

/**
 * Resets every Filtrer-panel filter to its default, keeping the text search and the sort.
 * The page is reset to 1 since the result set changes.
 */
export function clearFilters(query: DossiersQuery): DossiersQuery {
  return {
    ...defaultDossiersQuery(),
    text: query.text,
    sort: query.sort,
    order: query.order,
  };
}
