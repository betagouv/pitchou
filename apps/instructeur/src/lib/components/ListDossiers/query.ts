import type {
  DossierSummary,
  DossierPhase,
  DossierNextActionExpectedFrom,
} from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";
import {
  readLocalisation,
  writeLocalisation,
  type Localisation,
  type DepartementSelection,
} from "./localisation.ts";

/** Sentinel value for the « sans instructeur·ice » option of the instructeur filter */
export const WITHOUT_INSTRUCTEUR = "sans-instructeur";

/**
 * Code of a Pitchou activity (`activite` referentiel), as carried by
 * `DossierSummary.activite_code`. The « activité » filter works on codes so that dossiers whose
 * raw DN label was renamed over time stay grouped under one activity.
 */
export type ActiviteCode = NonNullable<DossierSummary["activite_code"]>;

/** Dossier date the « dates » filter applies to */
export type DateField = "deposit" | "phaseStart" | "lastModified" | "nextDue";

export type SortKey = "depositDate" | "lastModified" | "nextDueDate";
export type SortOrder = "asc" | "desc";

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

/** « nouveaute » state: with / without / no filter */
export type Nouveaute = "" | "oui" | "non";

export const SORT_OPTIONS: { key: SortKey; label: string; orderable: boolean }[] = [
  { key: "depositDate", label: "Date de dépôt", orderable: true },
  { key: "lastModified", label: "Dernière modification", orderable: true },
  { key: "nextDueDate", label: "Date de prochaine échéance", orderable: true },
];

const SORT_KEYS: readonly string[] = SORT_OPTIONS.map((option) => option.key);
const DATE_FIELDS: readonly DateField[] = ["deposit", "phaseStart", "lastModified", "nextDue"];

/** « Entité en charge de la prochaine action » options, in display order, with their labels */
export const PROCHAINE_ACTION_OPTIONS: {
  value: DossierNextActionExpectedFrom;
  label: string;
}[] = [
  { value: "Instructeur", label: "Instructeur·ice" },
  { value: "CNPN/CSRPN", label: "CNPN/CSRPN" },
  { value: "Pétitionnaire", label: "Pétitionnaire" },
  { value: "Consultation du public", label: "Consultation du public" },
  { value: "Préfet-e", label: "Préfet-e" },
  { value: "Tierce personne/administration", label: "Tierce personne/administration" },
];

export const PROCHAINE_ACTION_LABEL = new Map(
  PROCHAINE_ACTION_OPTIONS.map((o) => [o.value, o.label]),
);

export const DATE_FIELD_LABEL: Record<DateField, string> = {
  deposit: "de dépôt",
  phaseStart: "de début de phase",
  lastModified: "de dernière modification",
  nextDue: "de prochaine échéance",
};

/**
 * External data needed for filtering and sorting that is not carried by the URL:
 * notifications (seen / last update) and the instructeur → dossiers follow relation.
 */
export type DossiersContext = {
  notificationByDossier: PitchouState["notificationByDossier"];
  followRelations?: PitchouState["followRelations"];
  especeByCD_REF?: PitchouState["espèceByCD_REF"];
};

/**
 * Search / filters / sort / pagination, read from (and serialized to) the URL.
 * The categorical filters are multi-valued (OR within each filter): a dossier
 * matches when its value is among the selected ones; an empty array means « no filter ».
 * Departments instead use departementSelection to distinguish all from none within a scope.
 */
export type DossiersQuery = {
  text: string;
  phase: DossierPhase[];
  activite: ActiviteCode[];
  /** CD_REF of the especes protegees a dossier must impact at least one of */
  espece: string[];
  prochaineAction: DossierNextActionExpectedFrom[];
  departement: string[];
  localisation: Localisation;
  departementSelection: DepartementSelection;
  instructeur: string[];
  nouveaute: Nouveaute;
  actionInstructeur: boolean;
  /** Keep only dossiers flagged « à enjeu » */
  enjeu: boolean;
  /** Substring searched among the décision administrative numbers */
  decisionText: string;
  /** Keep only dossiers with no décision administrative */
  decisionAbsente: boolean;
  /** Keep only dossiers missing a saisine or avis expert file */
  avisExpertManquant: boolean;
  /** Keep only dossiers whose especes impactees list is « non-renseignée » */
  especesImpacteesAbsente: boolean;
  dateField: DateField;
  dateStart: string;
  dateEnd: string;
  sort: SortKey;
  order: SortOrder;
  page: number;
  pageSize: number;
};

/** Sort applied by the list when the URL carries no explicit sort */
export const DEFAULT_SORT: SortKey = "depositDate";
export const DEFAULT_ORDER: SortOrder = "desc";

/**
 * Reads a query from the URL and applies the list's UI default sort (« date de dépôt,
 * les plus récentes ») when the URL carries none.
 */
export function readDossiersQuery(params: URLSearchParams): DossiersQuery {
  const query = parseDossiersQuery(params);
  if (!params.has("sort")) {
    query.sort = DEFAULT_SORT;
    query.order = DEFAULT_ORDER;
  }
  return query;
}

/**
 * Serializes a query into URL params, omitting defaults to keep the URL short.
 * Round-trips with {@link parseDossiersQuery} / {@link readDossiersQuery}.
 */
export function buildDossiersSearchParams(query: DossiersQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.text.trim()) params.set("q", query.text.trim());
  for (const phase of query.phase) params.append("phase", phase);
  for (const activite of query.activite) params.append("activite", activite);
  for (const cdRef of query.espece) params.append("espece", cdRef);
  for (const action of query.prochaineAction) params.append("action", action);
  writeLocalisation(params, query);
  for (const instructeur of query.instructeur) params.append("instructeur", instructeur);
  if (query.nouveaute) params.set("nouveaute", query.nouveaute);
  if (query.actionInstructeur) params.set("actionInstructeur", "1");
  if (query.enjeu) params.set("enjeu", "1");
  if (query.decisionText.trim()) params.set("decision", query.decisionText.trim());
  if (query.decisionAbsente) params.set("decisionAbsente", "1");
  if (query.avisExpertManquant) params.set("avisManquant", "1");
  if (query.especesImpacteesAbsente) params.set("especesAbsente", "1");
  if (query.dateStart) params.set("from", query.dateStart);
  if (query.dateEnd) params.set("to", query.dateEnd);
  if ((query.dateStart || query.dateEnd) && query.dateField !== "deposit") {
    params.set("dateField", query.dateField);
  }
  if (query.sort !== DEFAULT_SORT || query.order !== DEFAULT_ORDER) {
    params.set("sort", query.sort);
    params.set("order", query.order);
  }
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(query.pageSize));

  return params;
}

/** Reads the state from the URL params, falling back to defaults when missing or invalid */
export function parseDossiersQuery(params: URLSearchParams): DossiersQuery {
  const nouveaute = params.get("nouveaute");
  const dateField = params.get("dateField") ?? "";
  const sort = params.get("sort") ?? "";
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("pageSize"));

  return {
    text: params.get("q") ?? "",
    phase: params.getAll("phase") as DossierPhase[],
    activite: params.getAll("activite"),
    espece: params.getAll("espece"),
    prochaineAction: params.getAll("action") as DossierNextActionExpectedFrom[],
    ...readLocalisation(params),
    instructeur: params.getAll("instructeur"),
    nouveaute: nouveaute === "oui" || nouveaute === "non" ? nouveaute : "",
    actionInstructeur: params.get("actionInstructeur") === "1",
    enjeu: params.get("enjeu") === "1",
    decisionText: params.get("decision") ?? "",
    decisionAbsente: params.get("decisionAbsente") === "1",
    avisExpertManquant: params.get("avisManquant") === "1",
    especesImpacteesAbsente: params.get("especesAbsente") === "1",
    dateField: (DATE_FIELDS as readonly string[]).includes(dateField)
      ? (dateField as DateField)
      : "deposit",
    dateStart: params.get("from") ?? "",
    dateEnd: params.get("to") ?? "",
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : DEFAULT_SORT,
    order: params.get("order") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** A query with every field at its default (no search, no filter, default sort) */
export function defaultDossiersQuery(): DossiersQuery {
  return parseDossiersQuery(new URLSearchParams());
}

export function toggleWithoutInstructeur(query: DossiersQuery): DossiersQuery {
  const instructeur = query.instructeur.includes(WITHOUT_INSTRUCTEUR)
    ? query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR)
    : [...query.instructeur, WITHOUT_INSTRUCTEUR];
  return { ...copyDossiersQuery(query), instructeur, page: 1 };
}

export function toggleBooleanFilter(
  query: DossiersQuery,
  key: "enjeu" | "actionInstructeur",
): DossiersQuery {
  return { ...copyDossiersQuery(query), [key]: !query[key], page: 1 };
}

/** Copies a query, cloning its arrays so a draft never mutates the original */
export function copyDossiersQuery(query: DossiersQuery): DossiersQuery {
  return {
    ...query,
    phase: [...query.phase],
    activite: [...query.activite],
    espece: [...query.espece],
    prochaineAction: [...query.prochaineAction],
    departement: [...query.departement],
    instructeur: [...query.instructeur],
  };
}
