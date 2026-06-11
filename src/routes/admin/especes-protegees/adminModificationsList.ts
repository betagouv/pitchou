import type { EspèceProtégée } from "$types/especes.d.ts";
import type { ModificationEspeceAdmin } from "$front/actions/adminEspeces.ts";
import { normalizeNomEspèce, normalizeTexteEspèce } from "$commun/manipulationStrings.ts";

import { CLASSIFICATIONS, STATUTS } from "../../especes-protegees/especesList.ts";

export { CLASSIFICATIONS, STATUTS };

/** The name shown in the list: the manual override, else the reference, else the cd_ref. */
export function displayedNom(modification: ModificationEspeceAdmin): string {
  return (
    modification.noms_scientifiques?.[0] ||
    modification.reference_noms_scientifiques?.[0] ||
    modification.cd_ref
  );
}

/** Effective classification: the override if set, otherwise the inherited reference one. */
export function effectiveClassification(modification: ModificationEspeceAdmin): string | null {
  return modification.classification ?? modification.reference_classification;
}

/** Effective statuts: the override if set, otherwise the inherited reference ones. */
export function effectiveStatuts(modification: ModificationEspeceAdmin): string[] {
  return modification.cd_type_statuts ?? modification.reference_cd_type_statuts ?? [];
}

// --- Search / filter / sort ---

export type EtatFilter = "" | "exclues" | "actives";
export type ListeFilter = "" | "ministerielle" | "cnpn";
export type ModificationSortKey = "updated_at" | "nom" | "cdref";
export type SortOrder = "asc" | "desc";

export const SORT_OPTIONS: { key: ModificationSortKey; label: string }[] = [
  { key: "updated_at", label: "Mise à jour" },
  { key: "nom", label: "Nom" },
  { key: "cdref", label: "CD_REF" },
];

export type ModificationsQuery = {
  searchText: string;
  classification: string;
  statut: string;
  etat: EtatFilter;
  liste: ListeFilter;
  sort: ModificationSortKey;
  order: SortOrder;
};

export function defaultQuery(): ModificationsQuery {
  return {
    searchText: "",
    classification: "",
    statut: "",
    etat: "",
    liste: "",
    sort: "updated_at",
    order: "desc",
  };
}

/** Client-side text search over cd_ref + override names + reference name. */
export function matchesText(modification: ModificationEspeceAdmin, text: string): boolean {
  const words = text
    .trim()
    .split(" ")
    .map(normalizeTexteEspèce)
    .filter((word) => word.length >= 1);

  const haystack = [
    modification.cd_ref,
    ...(modification.reference_noms_scientifiques ?? []),
    ...(modification.noms_scientifiques ?? []),
    ...(modification.noms_vernaculaires ?? []),
  ].map(normalizeNomEspèce);

  return words.every((word) => haystack.some((value) => value.includes(word)));
}

export function filterModifications(
  modifications: ModificationEspeceAdmin[],
  query: ModificationsQuery,
): ModificationEspeceAdmin[] {
  let result = modifications;

  if (query.classification) {
    result = result.filter((m) => effectiveClassification(m) === query.classification);
  }
  if (query.statut) {
    result = result.filter((m) => effectiveStatuts(m).includes(query.statut));
  }
  if (query.etat === "exclues") {
    result = result.filter((m) => m.exclu);
  } else if (query.etat === "actives") {
    result = result.filter((m) => !m.exclu);
  }
  if (query.liste === "ministerielle") {
    result = result.filter((m) => m.espece_ministerielle === true);
  } else if (query.liste === "cnpn") {
    result = result.filter((m) => m.espece_cnpn === true);
  }

  const text = query.searchText.trim();
  if (text) {
    result = result.filter((m) => matchesText(m, text));
  }

  return result;
}

export function compareModifications(
  a: ModificationEspeceAdmin,
  b: ModificationEspeceAdmin,
  sortKey: ModificationSortKey,
  sortOrder: SortOrder,
): number {
  const direction = sortOrder === "asc" ? 1 : -1;
  switch (sortKey) {
    case "cdref":
      return (Number(a.cd_ref) - Number(b.cd_ref)) * direction;
    case "nom":
      return displayedNom(a).localeCompare(displayedNom(b), "fr") * direction;
    case "updated_at":
    default:
      return a.updated_at.localeCompare(b.updated_at) * direction;
  }
}

// --- Seeds for the « Ajouter » flow ---

/** A blank net-new modification (no reference) with an editable cd_ref. */
export function emptySeed(cd_ref = ""): ModificationEspeceAdmin {
  return {
    cd_ref,
    classification: null,
    noms_scientifiques: null,
    noms_vernaculaires: null,
    cd_type_statuts: null,
    espece_ministerielle: null,
    espece_cnpn: null,
    exclu: false,
    modifie_par: null,
    created_at: "",
    updated_at: "",
    reference_noms_scientifiques: null,
    reference_classification: null,
    reference_cd_type_statuts: null,
    reference_noms_vernaculaires: null,
  };
}

/** A seed for an existing reference species chosen in the selector (overrides inherited). */
export function seedFromEspece(espece: EspèceProtégée): ModificationEspeceAdmin {
  return {
    ...emptySeed(espece.CD_REF),
    reference_noms_scientifiques: [...espece.nomsScientifiques],
    reference_classification: espece.classification,
    reference_cd_type_statuts: [...espece.CD_TYPE_STATUTS],
    reference_noms_vernaculaires: [...espece.nomsVernaculaires],
  };
}
