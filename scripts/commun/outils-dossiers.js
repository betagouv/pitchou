
//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {DossierComplet, DossierPhase, DossierRésumé} from '../types/API_Pitchou.ts' */

/**
 * @param {DossierComplet} dossierComplet
 * @returns {DossierRésumé}
 */
export function DossierCompletToDossierRésumé(dossierComplet) {
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
        historique_date_réception_ddep,
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
    /** @type {DossierPhase} */
    const phaseActuelle = évènementsPhase[0] ? évènementsPhase[0].phase : 'Accompagnement amont'
    const dateDébutPhaseActuelle = évènementsPhase[0] ? évènementsPhase[0].horodatage : date_dépôt

    /** @type {DossierRésumé} */
    const dossierRésumé = {
        
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
        historique_date_réception_ddep,
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
        prochaine_action_attendue_par
    }

    Object.freeze(dossierRésumé);

    return dossierRésumé
}