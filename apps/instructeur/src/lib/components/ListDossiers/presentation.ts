import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

/** Cards show the applicant's name only; other dossier views still include the SIRET. */
export function applicantName(dossier: DossierSummary): string {
  if (dossier.demandeur_personne_morale_siret || dossier.demandeur_personne_morale_legal_name) {
    return dossier.demandeur_personne_morale_legal_name || "(non renseigné)";
  }
  return (
    [dossier.demandeur_personne_physique_last_name, dossier.demandeur_personne_physique_first_names]
      .filter(Boolean)
      .join(" ") ||
    [dossier.deposant_last_name, dossier.deposant_first_names].filter(Boolean).join(" ") ||
    "(non renseigné)"
  );
}
