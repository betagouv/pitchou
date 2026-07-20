import type { DossierSearchEventDetails } from "@pitchou/types/evenement.d.ts";
import { WITHOUT_INSTRUCTEUR, type DossiersQuery } from "./dossiersQuery.ts";

/** Builds the search/filter analytics event from the resulting query */
export function buildSearchEvent(
  query: DossiersQuery,
  resultCount: number,
  context: { instructeurCount: number; email: string },
): DossierSearchEventDetails {
  const filters: DossierSearchEventDetails["filters"] = {
    nouveaute: query.nouveaute !== "",
  };

  if (query.text.trim()) {
    filters.text = query.text;
  }
  if (query.phase.length) {
    filters.phases = query.phase;
  }
  if (query.activite.length) {
    filters.activitesPrincipales = query.activite;
  }
  if (query.prochaineAction.length) {
    filters.nextActionExpectedFrom = query.prochaineAction;
  } else if (query.actionInstructeur) {
    filters.nextActionExpectedFrom = ["Instructeur"];
  }
  if (query.departement.length) {
    filters.departements = query.departement;
  }
  if (query.instructeur.includes(WITHOUT_INSTRUCTEUR)) {
    filters.withoutInstructeur = true;
  }
  const selectedEmails = query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR);
  if (selectedEmails.length) {
    filters.followedBy = {
      selectedCount: selectedEmails.length,
      totalCount: context.instructeurCount,
      includesSelf: selectedEmails.includes(context.email),
    };
  }

  return { filters, resultCount };
}
