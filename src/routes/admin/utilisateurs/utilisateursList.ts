import type { NiveauAARRI, UtilisateurAARRI } from "$types/API_Pitchou.ts";
import { retirerAccents } from "$commun/manipulationStrings.ts";

/** AARRI levels in display order: highest funnel stage first. */
export const NIVEAUX: NiveauAARRI[] = ["impact", "retenu", "actif", "acquis", "base"];

/** Funnel rank used to sort by level (higher = further down the funnel). */
const NIVEAU_RANK: Record<NiveauAARRI, number> = {
  base: 0,
  acquis: 1,
  actif: 2,
  retenu: 3,
  impact: 4,
};

export const NIVEAU_LABELS: Record<NiveauAARRI, string> = {
  base: "Base",
  acquis: "Acquis",
  actif: "Actif",
  retenu: "Retenu",
  impact: "Impact",
};

export type SortKey = "niveau" | "email" | "nom" | "actions" | "activite";

export type SortOrder = "asc" | "desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "niveau", label: "Niveau AARRI" },
  { key: "email", label: "Email" },
  { key: "nom", label: "Nom" },
  { key: "actions", label: "Nombre d'actions" },
  { key: "activite", label: "Dernière activité" },
];

const SORT_KEYS: readonly string[] = SORT_OPTIONS.map((option) => option.key);

/** Search / filter / sort / pagination state, parsed from (and serialized to) the URL */
export type UtilisateursQuery = {
  searchText: string;
  niveau: NiveauAARRI | "";
  sort: SortKey;
  order: SortOrder;
  page: number;
};

/**
 * Reads the query state from URL params, falling back to defaults for missing or
 * invalid values. The default view sorts by level, highest funnel stage first.
 */
export function parseUtilisateursQuery(params: URLSearchParams): UtilisateursQuery {
  const niveau = params.get("niveau") ?? "";
  const sort = params.get("tri") ?? "";
  const page = Number(params.get("page"));

  return {
    searchText: params.get("q") ?? "",
    niveau: (NIVEAUX as readonly string[]).includes(niveau) ? (niveau as NiveauAARRI) : "",
    sort: SORT_KEYS.includes(sort) ? (sort as SortKey) : "niveau",
    order: params.get("ordre") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

function normalize(value: string | null): string {
  return retirerAccents((value ?? "").toLowerCase());
}

/** Matches if every search word is a substring of the email, nom or prénoms. */
export function matchesText(utilisateur: UtilisateurAARRI, text: string): boolean {
  const words = text
    .trim()
    .split(" ")
    .map((word) => retirerAccents(word.toLowerCase()))
    .filter((word) => word.length >= 1);

  const haystack = [utilisateur.email, utilisateur.nom, utilisateur.prenoms]
    .map(normalize)
    .join(" ");

  return words.every((word) => haystack.includes(word));
}

/** Applies the active level filter and text search from `query`. */
export function filterUtilisateurs(
  utilisateurs: UtilisateurAARRI[],
  query: UtilisateursQuery,
): UtilisateurAARRI[] {
  let result = utilisateurs;

  if (query.niveau) {
    result = result.filter((utilisateur) => utilisateur.niveau === query.niveau);
  }

  const text = query.searchText.trim();
  if (text) {
    result = result.filter((utilisateur) => matchesText(utilisateur, text));
  }

  return result;
}

function activityTime(utilisateur: UtilisateurAARRI): number {
  return utilisateur.lastActivityDate ? Date.parse(utilisateur.lastActivityDate) : 0;
}

export function compareUtilisateurs(
  a: UtilisateurAARRI,
  b: UtilisateurAARRI,
  sortKey: SortKey,
  sortOrder: SortOrder,
): number {
  const direction = sortOrder === "asc" ? 1 : -1;
  switch (sortKey) {
    case "email":
      return (a.email ?? "").localeCompare(b.email ?? "", "fr") * direction;
    case "nom":
      return (
        `${a.nom ?? ""} ${a.prenoms ?? ""}`.localeCompare(
          `${b.nom ?? ""} ${b.prenoms ?? ""}`,
          "fr",
        ) * direction
      );
    case "actions":
      return (a.actionCount - b.actionCount) * direction;
    case "activite":
      return (activityTime(a) - activityTime(b)) * direction;
    case "niveau":
    default:
      return (NIVEAU_RANK[a.niveau] - NIVEAU_RANK[b.niveau]) * direction;
  }
}
