import type { DossierFull, DossierPhase, DossierSummary } from "@pitchou/types/API_Pitchou.ts";

export function DossierFullToDossierSummary(dossierFull: DossierFull): DossierSummary {
  const {
    // Properties copied directly
    id,
    demarche_numerique_number,
    name,
    main_activite,
    enjeu,
    free_comment,
    linked_to_ae_regime,
    onagre_demande_identifier,
    depot_date,
    decisionsAdministratives,

    // Localisation (already in the right format)
    communes,
    departments,
    regions,

    // People involved
    deposant_last_name,
    deposant_first_names,
    demandeur_personne_physique_last_name,
    demandeur_personne_physique_first_names,
    demandeur_personne_morale_legal_name,
    demandeur_personne_morale_siret,

    // Next action
    next_action_expected_from,

    // Avis d'expert (for the presence of the files)
    avisExpert,

    // especes impactees file, for presence
    especesImpactees,

    // Events used to extract the phase
    evenementsPhase,
  } = dossierFull;

  // Find the most recent phase
  // PPP to fix
  const currentPhase: DossierPhase = evenementsPhase[0]
    ? evenementsPhase[0].phase
    : "Accompagnement amont";
  const currentPhaseStartDate = evenementsPhase[0] ? evenementsPhase[0].timestamp : depot_date;

  const dossierSummary: DossierSummary = {
    // Simple properties
    id,
    demarche_numerique_number,
    name,
    main_activite,
    enjeu,
    free_comment,
    linked_to_ae_regime,
    onagre_demande_identifier,
    decisionsAdministratives: decisionsAdministratives?.map((decision) => ({
      ...decision,
      hasFile: decision.fichier_url !== undefined,
    })),
    avisExperts: avisExpert.map((ae) => ({
      expert: ae.expert,
      hasSaisineFile: ae.saisine_fichier_url !== undefined,
      hasAvisFile: ae.avis_fichier_url !== undefined,
    })),
    especesImpacteesRenseignees: especesImpactees !== undefined,

    // Statistics
    depot_date,

    // Localisation
    communes,
    departments,
    regions,

    // People involved
    deposant_last_name,
    deposant_first_names,
    demandeur_personne_physique_last_name,
    demandeur_personne_physique_first_names,
    demandeur_personne_morale_legal_name,
    demandeur_personne_morale_siret,

    // Phase and next action
    phase: currentPhase,
    phase_start_date: currentPhaseStartDate,
    next_action_expected_from,
  };

  Object.freeze(dossierSummary);

  return dossierSummary;
}
