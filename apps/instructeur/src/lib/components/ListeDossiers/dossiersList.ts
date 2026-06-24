import type {
  DossierRésumé,
  DossierPhase,
  DossierProchaineActionAttenduePar,
} from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { ÉvènementRechercheDossiersDétails } from "@pitchou/types/évènement.d.ts";
import { créerFiltreTexte } from "$lib/dossier/filtresTexte.ts";
import {
  départements as allDepartements,
  nomParCodeDépartement as nomByCodeDepartement,
} from "@pitchou/common/départements.ts";

/** Sentinel value for the « sans instructeur·ice » option of the instructeur filter */
export const WITHOUT_INSTRUCTEUR = "sans-instructeur";

export type ActivitePrincipale = NonNullable<DossierRésumé["activité_principale"]>;

/** Dossier date the « dates » filter applies to */
export type DateField = "deposit" | "phaseStart" | "lastModified";

export type SortKey = "nouveaute" | "depositDate" | "name" | "lastModified";
export type SortOrder = "asc" | "desc";

/** « nouveaute » state: with / without / no filter */
export type Nouveaute = "" | "oui" | "non";

export const SORT_OPTIONS: { key: SortKey; label: string; orderable: boolean }[] = [
  { key: "nouveaute", label: "Nouveauté", orderable: false },
  { key: "depositDate", label: "Date de dépôt", orderable: true },
  { key: "name", label: "Nom du dossier", orderable: true },
  { key: "lastModified", label: "Dernière modification", orderable: true },
];

const SORT_KEYS: readonly string[] = SORT_OPTIONS.map((option) => option.key);
const DATE_FIELDS: readonly DateField[] = ["deposit", "phaseStart", "lastModified"];

/**
 * External data needed for filtering and sorting that is not carried by the URL:
 * notifications (seen / last update) and the instructeur → dossiers follow relation.
 */
export type DossiersContext = {
  notificationParDossier: PitchouState["notificationParDossier"];
  relationSuivis?: PitchouState["relationSuivis"];
};

/**
 * Search / filters / sort / pagination, read from (and serialized to) the URL.
 * The categorical filters are multi-valued (OR within each filter): a dossier
 * matches when its value is among the selected ones; an empty array means « no filter ».
 */
export type DossiersQuery = {
  text: string;
  phase: DossierPhase[];
  activite: ActivitePrincipale[];
  prochaineAction: DossierProchaineActionAttenduePar[];
  departement: string[];
  instructeur: string[];
  nouveaute: Nouveaute;
  actionInstructeur: boolean;
  dateField: DateField;
  dateStart: string;
  dateEnd: string;
  sort: SortKey;
  order: SortOrder;
  page: number;
};

/** Reads the state from the URL params, falling back to defaults when missing or invalid */
export function parseDossiersQuery(params: URLSearchParams): DossiersQuery {
  const nouveaute = params.get("nouveaute");
  const dateField = params.get("dateField") ?? "";
  const sort = params.get("sort") ?? "";
  const page = Number(params.get("page"));

  return {
    text: params.get("q") ?? "",
    phase: params.getAll("phase") as DossierPhase[],
    activite: params.getAll("activite") as ActivitePrincipale[],
    prochaineAction: params.getAll("action") as DossierProchaineActionAttenduePar[],
    departement: params.getAll("departement"),
    instructeur: params.getAll("instructeur"),
    nouveaute: nouveaute === "oui" || nouveaute === "non" ? nouveaute : "",
    actionInstructeur: params.get("actionInstructeur") === "1",
    dateField: (DATE_FIELDS as readonly string[]).includes(dateField)
      ? (dateField as DateField)
      : "deposit",
    dateStart: params.get("from") ?? "",
    dateEnd: params.get("to") ?? "",
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : "nouveaute",
    order: params.get("order") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

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
    const filtreTexte = créerFiltreTexte(query.text, dossiers);
    result = result.filter(filtreTexte);
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

function lastModifiedDate(
  dossierId: DossierRésumé["id"],
  notificationParDossier: DossiersContext["notificationParDossier"],
): Date | undefined {
  return notificationParDossier.get(dossierId)?.date_dernière_mise_à_jour ?? undefined;
}

/**
 * « nouveaute » sort: unseen notifications first (most recent first),
 * then by date_dépôt descending.
 */
function compareByNouveaute(
  a: DossierRésumé,
  b: DossierRésumé,
  notificationParDossier: DossiersContext["notificationParDossier"],
): number {
  const notificationA = notificationParDossier.get(a.id);
  const notificationB = notificationParDossier.get(b.id);

  const unseenDateA =
    notificationA?.vue === false ? notificationA.date_dernière_mise_à_jour : undefined;
  const unseenDateB =
    notificationB?.vue === false ? notificationB.date_dernière_mise_à_jour : undefined;

  if (unseenDateA && unseenDateB) {
    return unseenDateA > unseenDateB ? -1 : 1;
  } else if (unseenDateA && unseenDateB === undefined) {
    return -1;
  } else if (unseenDateA === undefined && unseenDateB) {
    return 1;
  }

  return a.date_dépôt > b.date_dépôt ? -1 : 1;
}

export function compareDossiers(
  a: DossierRésumé,
  b: DossierRésumé,
  sortKey: SortKey,
  sortOrder: SortOrder,
  notificationParDossier: DossiersContext["notificationParDossier"],
): number {
  const direction = sortOrder === "asc" ? 1 : -1;

  switch (sortKey) {
    case "name":
      return (a.nom ?? "").localeCompare(b.nom ?? "", "fr") * direction;
    case "depositDate":
      if (a.date_dépôt > b.date_dépôt) return direction;
      if (a.date_dépôt < b.date_dépôt) return -direction;
      return 0;
    case "lastModified": {
      const dateA = lastModifiedDate(a.id, notificationParDossier);
      const dateB = lastModifiedDate(b.id, notificationParDossier);
      // Dossiers with no known date are placed last, regardless of direction
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      if (dateA > dateB) return direction;
      if (dateA < dateB) return -direction;
      return 0;
    }
    case "nouveaute":
    default:
      return compareByNouveaute(a, b, notificationParDossier);
  }
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
  "dateField",
  "from",
  "to",
] as const;

/** Updates that clear every Filtrer-panel filter; text search, sort and page are left untouched */
export function buildClearFiltersUpdates(): Record<string, null> {
  return Object.fromEntries(FILTER_PARAM_KEYS.map((key) => [key, null]));
}

/** Number of active filters from the Filtrer panel (text search excluded) */
export function countActiveFilters(query: DossiersQuery): number {
  return (
    (query.phase.length ? 1 : 0) +
    (query.activite.length ? 1 : 0) +
    (query.prochaineAction.length ? 1 : 0) +
    (query.departement.length ? 1 : 0) +
    (query.instructeur.length ? 1 : 0) +
    (query.nouveaute ? 1 : 0) +
    (query.dateStart || query.dateEnd ? 1 : 0) +
    (query.actionInstructeur ? 1 : 0)
  );
}

/** Builds the search/filter analytics event from the resulting query */
export function buildSearchEvent(
  query: DossiersQuery,
  resultCount: number,
  context: { instructeurCount: number; email: string },
): ÉvènementRechercheDossiersDétails {
  const filtres: ÉvènementRechercheDossiersDétails["filtres"] = {
    nouveauté: query.nouveaute !== "",
  };

  if (query.text.trim()) {
    filtres.texte = query.text;
  }
  if (query.phase.length) {
    filtres.phases = query.phase;
  }
  if (query.activite.length) {
    filtres.activitésPrincipales = query.activite;
  }
  if (query.prochaineAction.length) {
    filtres.prochaineActionAttenduePar = query.prochaineAction;
  } else if (query.actionInstructeur) {
    filtres.prochaineActionAttenduePar = ["Instructeur"];
  }
  if (query.departement.length) {
    filtres.départements = query.departement;
  }
  if (query.instructeur.includes(WITHOUT_INSTRUCTEUR)) {
    filtres.sansInstructeurice = true;
  }
  const selectedEmails = query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR);
  if (selectedEmails.length) {
    filtres.suiviPar = {
      nombreSéléctionnées: selectedEmails.length,
      nombreTotal: context.instructeurCount,
      inclusSoiMême: selectedEmails.includes(context.email),
    };
  }

  return { filtres, nombreRésultats: resultCount };
}
