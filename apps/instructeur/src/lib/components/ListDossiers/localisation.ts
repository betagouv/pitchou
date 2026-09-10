import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { copyDossiersQuery, type DossiersQuery } from "./query.ts";

export type Localisation = "assigned" | "france";
export type DepartementSelection = "all" | "none" | "custom";
type LocalisationQuery = Pick<
  DossiersQuery,
  "localisation" | "departementSelection" | "departement"
>;

export const LOCALISATION_LABEL: Record<Localisation, string> = {
  assigned: "Mes territoires d'affectation",
  france: "France entière (lecture seule)",
};

export function readLocalisation(params: URLSearchParams): LocalisationQuery {
  const departments = [...new Set(params.getAll("departement").filter(Boolean))];
  const selection = params.get("departements");
  const departementSelection: DepartementSelection =
    selection === "all" || selection === "none"
      ? selection
      : departments.length
        ? "custom"
        : selection === "custom"
          ? "none"
          : "all";
  return {
    departement: departementSelection === "custom" ? departments : [],
    localisation: params.get("localisation") === "france" ? "france" : "assigned",
    departementSelection,
  };
}

export function writeLocalisation(params: URLSearchParams, query: LocalisationQuery): void {
  if (query.localisation !== "assigned") params.set("localisation", query.localisation);
  if (query.departementSelection !== "all") params.set("departements", query.departementSelection);
  if (query.departementSelection === "custom") {
    for (const departement of query.departement) params.append("departement", departement);
  }
}

export function changeLocalisation(
  query: DossiersQuery,
  localisation: Localisation,
): DossiersQuery {
  return {
    ...copyDossiersQuery(query),
    localisation,
    departementSelection: "all",
    departement: [],
    page: 1,
  };
}

export function filterByLocalisation(
  dossiers: DossierSummary[],
  query: LocalisationQuery,
): DossierSummary[] {
  if (query.departementSelection === "none") return [];
  const selected = query.departementSelection === "custom" ? new Set(query.departement) : undefined;
  return dossiers.filter(
    (dossier) =>
      (query.localisation === "france" || dossier.access === "complet") &&
      (!selected || dossier.departments?.some((code) => selected.has(code))),
  );
}
