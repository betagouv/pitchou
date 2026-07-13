import type { ÉvènementRechercheDossiersDétails } from "@pitchou/types/évènement.d.ts";
import { WITHOUT_INSTRUCTEUR, type DossiersQuery } from "./dossiersQuery.ts";

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
