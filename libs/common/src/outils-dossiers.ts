import type { DossierComplet, DossierPhase, DossierRésumé } from "@pitchou/types/API_Pitchou.ts";

export function DossierCompletToDossierRésumé(dossierComplet: DossierComplet): DossierRésumé {
  const {
    // Propriétés directement copiées
    id,
    number_demarches_simplifiées,
    nom,
    activité_principale,
    enjeu_politique,
    enjeu_écologique,
    commentaire_libre,
    rattaché_au_régime_ae,
    historique_identifiant_demande_onagre,
    date_dépôt,
    décisionsAdministratives,

    // Localisation (déjà au bon format)
    communes,
    départements,
    régions,

    // Personnes impliquées
    déposant_nom,
    déposant_prénoms,
    demandeur_personne_physique_nom,
    demandeur_personne_physique_prénoms,
    demandeur_personne_morale_raison_sociale,
    demandeur_personne_morale_siret,

    // Prochaine action
    prochaine_action_attendue_par,

    // Évènements pour extraire la phase
    évènementsPhase,
  } = dossierComplet;

  // Trouver la phase la plus récente
  // PPP à corriger
  const phaseActuelle: DossierPhase = évènementsPhase[0]
    ? évènementsPhase[0].phase
    : "Accompagnement amont";
  const dateDébutPhaseActuelle = évènementsPhase[0] ? évènementsPhase[0].horodatage : date_dépôt;

  const dossierRésumé: DossierRésumé = {
    // Propriétés simples
    id,
    number_demarches_simplifiées,
    nom,
    activité_principale,
    enjeu_politique,
    enjeu_écologique,
    commentaire_libre,
    rattaché_au_régime_ae,
    historique_identifiant_demande_onagre,
    décisionsAdministratives,

    // Statistiques
    date_dépôt,

    // Localisation
    communes,
    départements,
    régions,

    // Personnes impliquées
    déposant_nom,
    déposant_prénoms,
    demandeur_personne_physique_nom,
    demandeur_personne_physique_prénoms,
    demandeur_personne_morale_raison_sociale,
    demandeur_personne_morale_siret,

    // Phase et prochaine action
    phase: phaseActuelle,
    date_début_phase: dateDébutPhaseActuelle,
    // @ts-ignore
    prochaine_action_attendue_par,
  };

  Object.freeze(dossierRésumé);

  return dossierRésumé;
}
