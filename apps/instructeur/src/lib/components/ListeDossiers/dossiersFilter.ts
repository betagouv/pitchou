import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import { retirerAccents } from "@pitchou/common/manipulationStrings.ts";
import { dossierMatchesSearch, searchTerms } from "./dossiersSearch.ts";
import {
  départements as allDepartements,
  nomParCodeDépartement as nomByCodeDepartement,
} from "@pitchou/common/départements.ts";
import {
  WITHOUT_INSTRUCTEUR,
  defaultDossiersQuery,
  type ActivitePrincipale,
  type DateField,
  type DossiersContext,
  type DossiersQuery,
} from "./dossiersQuery.ts";

/** True when the dossier is followed by at least one person */
function dossierIsFollowed(
  dossierId: DossierRésumé["id"],
  relationSuivis: DossiersContext["relationSuivis"],
): boolean {
  if (!relationSuivis) return false;
  for (const dossiersSuivis of relationSuivis.values()) {
    if (dossiersSuivis.has(dossierId)) return true;
  }
  return false;
}

/** Dossier date matching the field chosen in the « dates » filter */
export function dossierDate(
  dossier: DossierRésumé,
  field: DateField,
  notificationParDossier: DossiersContext["notificationParDossier"],
): Date | undefined {
  switch (field) {
    case "phaseStart":
      return dossier.date_début_phase ?? undefined;
    case "lastModified":
      return notificationParDossier.get(dossier.id)?.date_dernière_mise_à_jour ?? undefined;
    case "deposit":
    default:
      return dossier.date_dépôt ?? undefined;
  }
}

/** Applies the text search and every active filter of `query` */
export function filterDossiers(
  dossiers: DossierRésumé[],
  query: DossiersQuery,
  ctx: DossiersContext,
): DossierRésumé[] {
  const { notificationParDossier, relationSuivis } = ctx;
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
      (dossier) =>
        dossier.activité_principale !== null &&
        query.activite.includes(dossier.activité_principale),
    );
  }
  if (query.actionInstructeur) {
    result = result.filter((dossier) => dossier.prochaine_action_attendue_par === "Instructeur");
  }
  if (query.prochaineAction.length) {
    const selected = query.prochaineAction as readonly string[];
    result = result.filter(
      (dossier) =>
        dossier.prochaine_action_attendue_par !== null &&
        selected.includes(dossier.prochaine_action_attendue_par),
    );
  }
  if (query.departement.length) {
    result = result.filter(
      (dossier) => dossier.départements?.some((code) => query.departement.includes(code)) ?? false,
    );
  }
  if (query.instructeur.length) {
    // « sans instructeur » and named instructeurs combine with OR: keep dossiers that are
    // unfollowed and/or followed by any of the selected people.
    const includesWithoutInstructeur = query.instructeur.includes(WITHOUT_INSTRUCTEUR);
    const selectedEmails = query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR);
    result = result.filter((dossier) => {
      if (includesWithoutInstructeur && !dossierIsFollowed(dossier.id, relationSuivis)) return true;
      return selectedEmails.some((email) => relationSuivis?.get(email)?.has(dossier.id) ?? false);
    });
  }
  if (query.nouveaute === "oui") {
    result = result.filter((dossier) => notificationParDossier.get(dossier.id)?.vue === false);
  } else if (query.nouveaute === "non") {
    result = result.filter((dossier) => notificationParDossier.get(dossier.id)?.vue !== false);
  }
  if (query.enjeu) {
    result = result.filter((dossier) => dossier.enjeu === true);
  }
  if (query.decisionText.trim()) {
    const needle = retirerAccents(query.decisionText.trim()).toLowerCase();
    result = result.filter((dossier) =>
      (dossier.décisionsAdministratives ?? []).some(
        (decision) =>
          decision.numéro != null && retirerAccents(decision.numéro).toLowerCase().includes(needle),
      ),
    );
  }
  if (query.decisionAbsente) {
    result = result.filter((dossier) => (dossier.décisionsAdministratives?.length ?? 0) === 0);
  }
  if (query.avisExpertManquant) {
    result = result.filter((dossier) =>
      (dossier.avisExperts ?? []).some(
        (avis) => !avis.saisineFichierPresent || !avis.avisFichierPresent,
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
      const date = dossierDate(dossier, query.dateField, notificationParDossier);
      if (!date) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }

  return result;
}

export type DepartementOption = { code: string; nom: string };

/** Activités principales present in the dossiers, sorted alphabetically */
export function listAvailableActivites(dossiers: DossierRésumé[]): ActivitePrincipale[] {
  const activites = new Set<ActivitePrincipale>();
  for (const dossier of dossiers) {
    if (dossier.activité_principale) activites.add(dossier.activité_principale);
  }
  return [...activites].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Full list of départements (code + name) offered to the filter.
 * Starts from the official list and adds codes present in the dossiers but missing
 * from it, so that no dossier becomes impossible to filter.
 */
export function listAvailableDepartements(dossiers: DossierRésumé[]): DepartementOption[] {
  const presentCodes = new Set<string>();
  for (const dossier of dossiers) {
    for (const code of dossier.départements ?? []) presentCodes.add(code);
  }
  const unknownCodes = [...presentCodes]
    .filter((code) => !nomByCodeDepartement.has(code))
    .map((code) => ({ code, nom: code }));

  return [...allDepartements, ...unknownCodes].sort((a, b) =>
    a.code.localeCompare(b.code, "fr", { numeric: true }),
  );
}

/** Instructeurs following at least one dossier, identified by email, sorted alphabetically */
export function listAvailableInstructeurs(
  relationSuivis: DossiersContext["relationSuivis"],
): string[] {
  if (!relationSuivis) return [];
  const emails: string[] = [];
  for (const [instructeurEmail, dossiersSuivis] of relationSuivis) {
    if (dossiersSuivis.size > 0) emails.push(instructeurEmail);
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
