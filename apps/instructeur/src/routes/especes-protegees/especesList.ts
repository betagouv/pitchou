import type { EspeceProtegee, ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
import { normalizeNomEspece, normalizeTexteEspece } from "@pitchou/common/manipulationStrings.ts";

export const CLASSIFICATIONS: ClassificationEtreVivant[] = ["oiseau", "faune non-oiseau", "flore"];

export const STATUTS = ["PN", "PR", "PD", "POM", "Espèce manquante"] as const;
export type Statut = (typeof STATUTS)[number];

/** Membership filter: ministerielle / CNPN list (empty = no filter) */
export type ListeFilter = "" | "ministerielle" | "cnpn";

export type FilterKey = "text" | "classification" | "statut" | "list";

export type SortKey = "nomScientifique" | "nomVernaculaire" | "cdref";

export type SortOrder = "asc" | "desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "nomScientifique", label: "Nom scientifique" },
  { key: "nomVernaculaire", label: "Nom vernaculaire" },
  { key: "cdref", label: "CD_REF" },
];

const SORT_KEYS: readonly string[] = SORT_OPTIONS.map((option) => option.key);

/** Search / filter / sort / pagination state, parsed from (and serialized to) the URL */
export type EspecesQuery = {
  searchText: string;
  classification: ClassificationEtreVivant | "";
  statut: Statut | "";
  liste: ListeFilter;
  sort: SortKey;
  order: SortOrder;
  page: number;
};

/** Reads the query state from URL params, falling back to defaults for missing or invalid values */
export function parseEspecesQuery(params: URLSearchParams): EspecesQuery {
  const classification = params.get("classification") ?? "";
  const statut = params.get("statut") ?? "";
  const liste = params.get("liste") ?? "";
  const sort = params.get("tri") ?? "";
  const page = Number(params.get("page"));

  return {
    searchText: params.get("q") ?? "",
    classification: (CLASSIFICATIONS as readonly string[]).includes(classification)
      ? (classification as ClassificationEtreVivant)
      : "",
    statut: (STATUTS as readonly string[]).includes(statut) ? (statut as Statut) : "",
    liste: liste === "ministerielle" || liste === "cnpn" ? liste : "",
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : "nomScientifique",
    order: params.get("ordre") === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function firstName(names: Set<string>): string {
  return names.values().next().value ?? "";
}

/** Matches if every search word is a substring of any scientific or vernacular name */
export function matchesText(espece: EspeceProtegee, text: string): boolean {
  const words = text
    .trim()
    .split(" ")
    .map(normalizeTexteEspece)
    .filter((word) => word.length >= 1);

  return words.every((word) => {
    for (const name of espece.nomsScientifiques) {
      if (normalizeNomEspece(name).includes(word)) return true;
    }
    for (const name of espece.nomsVernaculaires) {
      if (normalizeNomEspece(name).includes(word)) return true;
    }
    return false;
  });
}

/** Applies the active attribute filters and text search from `query` */
export function filterEspeces(especes: EspeceProtegee[], query: EspecesQuery): EspeceProtegee[] {
  let result = especes;

  if (query.classification) {
    result = result.filter((espece) => espece.classification === query.classification);
  }
  if (query.statut) {
    result = result.filter((espece) => espece.CD_TYPE_STATUTS.has(query.statut as Statut));
  }
  if (query.liste === "ministerielle") {
    result = result.filter((espece) => espece.espèceMinistérielle === "O");
  } else if (query.liste === "cnpn") {
    result = result.filter((espece) => espece.espèceCNPN === "O");
  }

  const text = query.searchText.trim();
  if (text) {
    result = result.filter((espece) => matchesText(espece, text));
  }

  return result;
}

export function compareEspeces(
  a: EspeceProtegee,
  b: EspeceProtegee,
  sortKey: SortKey,
  sortOrder: "asc" | "desc",
): number {
  const direction = sortOrder === "asc" ? 1 : -1;
  switch (sortKey) {
    case "cdref":
      return (Number(a.CD_REF) - Number(b.CD_REF)) * direction;
    case "nomVernaculaire":
      return (
        firstName(a.nomsVernaculaires).localeCompare(firstName(b.nomsVernaculaires), "fr") *
        direction
      );
    case "nomScientifique":
    default:
      return (
        firstName(a.nomsScientifiques).localeCompare(firstName(b.nomsScientifiques), "fr") *
        direction
      );
  }
}
