//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../scripts/types/database/public/Dossier.ts' */

/** 
 * 
 * @param {any} x 
 * @returns {x is Dossier[]} 
 */
export function isDossierArray(x){
  return Array.isArray(x) && x.every(isDossier) 
}

/**
 * 
 * @param {any} x 
 * @returns {x is Dossier} 
 */
function isDossier(x) {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof x.id === "number" &&
    (typeof x.id_demarches_simplifiées === "string" || x.id_demarches_simplifiées === null) &&
    (typeof x.statut === "string" || x.statut === null) &&
    (x.date_dépôt instanceof Date || x.date_dépôt === null) &&
    (typeof x.espèces_protégées_concernées === "string" || x.espèces_protégées_concernées === null) &&
    (x.departements === null || typeof x.departements === "object") &&
    (x.communes === null || typeof x.communes === "object") &&
    (typeof x.déposant === "number" || x.déposant === null) &&
    (typeof x.demandeur_personne_physique === "number" || x.demandeur_personne_physique === null) &&
    (typeof x.demandeur_personne_morale === "string" || x.demandeur_personne_morale === null) &&
    (x.régions === null || typeof x.régions === "object") &&
    (typeof x.nom === "string" || x.nom === null) &&
    (typeof x.number_demarches_simplifiées === "string" || x.number_demarches_simplifiées === null) &&
    (typeof x.historique_nom_porteur === "string" || x.historique_nom_porteur === null) &&
    (typeof x.historique_localisation === "string" || x.historique_localisation === null) &&
    (typeof x.ddep_nécessaire === "string" || x.ddep_nécessaire === null) &&
    (typeof x.en_attente_de === "string" || x.en_attente_de === null) &&
    (typeof x.enjeu_politique === "boolean" || x.enjeu_politique === null) &&
    (typeof x.commentaire_enjeu === "string" || x.commentaire_enjeu === null) &&
    (x.historique_date_réception_ddep instanceof Date || x.historique_date_réception_ddep === null) &&
    (x.historique_date_envoi_dernière_contribution instanceof Date || x.historique_date_envoi_dernière_contribution === null) &&
    (typeof x.historique_identifiant_demande_onagre === "string" || x.historique_identifiant_demande_onagre === null) &&
    (x.historique_date_saisine_csrpn instanceof Date || x.historique_date_saisine_csrpn === null) &&
    (x.historique_date_saisine_cnpn instanceof Date || x.historique_date_saisine_cnpn === null) &&
    (x.date_avis_csrpn instanceof Date || x.date_avis_csrpn === null) &&
    (x.date_avis_cnpn instanceof Date || x.date_avis_cnpn === null) &&
    (typeof x.avis_csrpn_cnpn === "string" || x.avis_csrpn_cnpn === null) &&
    (x.date_consultation_public instanceof Date || x.date_consultation_public === null) &&
    (typeof x.historique_décision === "string" || x.historique_décision === null) &&
    (x.historique_date_signature_arrêté_préfectoral instanceof Date || x.historique_date_signature_arrêté_préfectoral === null) &&
    (typeof x.historique_référence_arrêté_préfectoral === "string" || x.historique_référence_arrêté_préfectoral === null) &&
    (x.historique_date_signature_arrêté_ministériel instanceof Date || x.historique_date_signature_arrêté_ministériel === null) &&
    (typeof x.historique_référence_arrêté_ministériel === "string" || x.historique_référence_arrêté_ministériel === null) &&
    (typeof x.enjeu_écologique === "boolean" || x.enjeu_écologique === null) &&
    (typeof x.commentaire_libre === "string" || x.commentaire_libre === null) &&
    (typeof x.rattaché_au_régime_ae === "boolean" || x.rattaché_au_régime_ae === null) &&
    (typeof x.phase === "string" || x.phase === null) &&
    (typeof x.prochaine_action_attendue_par === "string" || x.prochaine_action_attendue_par === null) &&
    (typeof x.prochaine_action_attendue === "string" || x.prochaine_action_attendue === null)
  )
}