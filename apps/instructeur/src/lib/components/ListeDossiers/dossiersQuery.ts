import type {
  DossierRésumé,
  DossierPhase,
  DossierProchaineActionAttenduePar,
} from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";

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

/** « Entité en charge de la prochaine action » options, in display order, with their labels */
export const PROCHAINE_ACTION_OPTIONS: {
  value: DossierProchaineActionAttenduePar;
  label: string;
}[] = [
  { value: "Instructeur", label: "Instructeur·ice" },
  { value: "CNPN/CSRPN", label: "CNPN/CSRPN" },
  { value: "Pétitionnaire", label: "Pétitionnaire" },
  { value: "Consultation du public", label: "Public consulté" },
  { value: "Autre administration", label: "Autre administration" },
  { value: "Autre", label: "Autre entité" },
];

export const PROCHAINE_ACTION_LABEL = new Map(
  PROCHAINE_ACTION_OPTIONS.map((o) => [o.value, o.label]),
);

export const DATE_FIELD_LABEL: Record<DateField, string> = {
  deposit: "de dépôt",
  phaseStart: "de début de phase",
  lastModified: "de dernière modification",
};

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
  for (const action of query.prochaineAction) params.append("action", action);
  for (const departement of query.departement) params.append("departement", departement);
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

  return params;
}

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
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : "nouveaute",
    order: params.get("order") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** A query with every field at its default (no search, no filter, default sort) */
export function defaultDossiersQuery(): DossiersQuery {
  return parseDossiersQuery(new URLSearchParams());
}

/** Copies a query, cloning its arrays so a draft never mutates the original */
export function copyDossiersQuery(query: DossiersQuery): DossiersQuery {
  return {
    ...query,
    phase: [...query.phase],
    activite: [...query.activite],
    prochaineAction: [...query.prochaineAction],
    departement: [...query.departement],
    instructeur: [...query.instructeur],
  };
}
