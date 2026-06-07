import type { EspèceProtégée, ClassificationEtreVivant } from "$types/especes.d.ts";
import { normalizeNomEspèce, normalizeTexteEspèce } from "$commun/manipulationStrings.ts";

export const CLASSIFICATIONS: ClassificationEtreVivant[] = ["oiseau", "faune non-oiseau", "flore"];

export const STATUTS = ["PN", "PR", "PD", "POM", "Protection Pitchou"] as const;
export type Statut = (typeof STATUTS)[number];

/** Membership filter: ministerielle / CNPN list (empty = no filter) */
export type ListeFilter = "" | "ministerielle" | "cnpn";

export type FilterKey = "text" | "classification" | "statut" | "list";

export type SortKey = "nomScientifique" | "nomVernaculaire" | "cdref";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "nomScientifique", label: "Nom scientifique" },
  { key: "nomVernaculaire", label: "Nom vernaculaire" },
  { key: "cdref", label: "CD_REF" },
];

export function firstName(names: Set<string>): string {
  return names.values().next().value ?? "";
}

/** Matches if every search word is a substring of any scientific or vernacular name */
export function matchesText(espece: EspèceProtégée, text: string): boolean {
  const words = text
    .trim()
    .split(" ")
    .map(normalizeTexteEspèce)
    .filter((word) => word.length >= 1);

  return words.every((word) => {
    for (const name of espece.nomsScientifiques) {
      if (normalizeNomEspèce(name).includes(word)) return true;
    }
    for (const name of espece.nomsVernaculaires) {
      if (normalizeNomEspèce(name).includes(word)) return true;
    }
    return false;
  });
}

export function compareEspeces(
  a: EspèceProtégée,
  b: EspèceProtégée,
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
