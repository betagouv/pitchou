import type { DossierFull, DossierPhase, DossierSummary } from "@pitchou/types/API_Pitchou.ts";

export function DossierFullToDossierSummary(dossierFull: DossierFull): DossierSummary {
  const {
    // Properties copied directly
    id,
    number_demarches_simplifiées,
    nom,
    activité_principale,
    enjeu,
    commentaire_libre,
    rattaché_au_régime_ae,
    historique_identifiant_demande_onagre,
    date_dépôt,
    décisionsAdministratives: decisionsAdministratives,

    // Localisation (already in the right format)
    communes,
    départements,
    régions,

    // People involved
    déposant_nom: deposant_nom,
    déposant_prénoms: deposant_prenoms,
    demandeur_personne_physique_nom,
    demandeur_personne_physique_prénoms: demandeur_personne_physique_prenoms,
    demandeur_personne_morale_raison_sociale,
    demandeur_personne_morale_siret,

    // Next action
    prochaine_action_attendue_par,

    // Events used to extract the phase
    évènementsPhase: evenementsPhase,
  } = dossierFull;

  // Find the most recent phase
  // PPP to fix
  const currentPhase: DossierPhase = evenementsPhase[0]
    ? evenementsPhase[0].phase
    : "Accompagnement amont";
  const currentPhaseStartDate = evenementsPhase[0] ? evenementsPhase[0].horodatage : date_dépôt;

  const dossierSummary: DossierSummary = {
    // Simple properties
    id,
    number_demarches_simplifiées,
    nom,
    activité_principale,
    enjeu,
    commentaire_libre,
    rattaché_au_régime_ae,
    historique_identifiant_demande_onagre,
    décisionsAdministratives: decisionsAdministratives,

    // Statistics
    date_dépôt,

    // Localisation
    communes,
    départements,
    régions,

    // People involved
    déposant_nom: deposant_nom,
    déposant_prénoms: deposant_prenoms,
    demandeur_personne_physique_nom,
    demandeur_personne_physique_prénoms: demandeur_personne_physique_prenoms,
    demandeur_personne_morale_raison_sociale,
    demandeur_personne_morale_siret,

    // Phase and next action
    phase: currentPhase,
    date_début_phase: currentPhaseStartDate,
    // @ts-ignore
    prochaine_action_attendue_par,
  };

  Object.freeze(dossierSummary);

  return dossierSummary;
}
