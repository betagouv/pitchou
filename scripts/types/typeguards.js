import { isValidDateString } from '../commun/typeFormat.js'

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../scripts/types/database/public/Dossier.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {OiseauAtteint, FauneNonOiseauAtteinte, FloreAtteinte} from '../types/especes.d.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierRésumé} from '../types/API_Pitchou.ts' */

/** 
 * 
 * @param {any} x 
 * @returns {x is DossierRésumé[]} 
 */
export function isDossierRésuméArray(x){
  return Array.isArray(x) && x.every(isDossierRésumé) 
}

/**
 * 
 * @param {any} x 
 * @returns {x is DossierRésumé} 
 */
function isDossierRésumé(x) {
  throw `PPP à réécrire`

  return (
    typeof x === "object" &&
    x !== null &&
    typeof x.id === "number" &&
    //(typeof x.id_demarches_simplifiées === "string" || x.id_demarches_simplifiées === null) &&
    (typeof x.statut === "string" || x.statut === null) &&
    (isValidDateString(x.date_dépôt) || x.date_dépôt === null) &&
    (x.departements === null || x.departements === undefined || Array.isArray(x.departements)) &&
    (x.communes === null || x.communes === undefined || Array.isArray(x.communes)) &&
    (typeof x.nom === "string" || x.nom === null) &&
    (typeof x.déposant_nom === "string" || x.déposant_nom === null) &&
    (typeof x.déposant_prénoms === "string" || x.déposant_prénoms === null) &&
    (typeof x.demandeur_personne_physique_nom === "string" || x.demandeur_personne_physique_nom === null) &&
    (typeof x.demandeur_personne_physique_prénoms === "string" || x.demandeur_personne_physique_prénoms === null) &&
    (typeof x.demandeur_personne_morale_raison_sociale === "string" || x.demandeur_personne_morale_raison_sociale === null) &&
    (typeof x.demandeur_personne_morale_siret === "string" || x.demandeur_personne_morale_siret === null) &&
    (x.régions === null || x.régions === undefined || Array.isArray(x.régions)) &&
    (typeof x.number_demarches_simplifiées === "string" || x.number_demarches_simplifiées === null) &&
    //(typeof x.historique_nom_porteur === "string" || x.historique_nom_porteur === null) &&
    //(typeof x.historique_localisation === "string" || x.historique_localisation === null) &&
    (typeof x.ddep_nécessaire === "string" || x.ddep_nécessaire === null) &&
    (typeof x.en_attente_de === "string" || x.en_attente_de === null) &&
    (typeof x.enjeu_politique === "boolean" || x.enjeu_politique === null) &&
    (typeof x.enjeu_écologique === "boolean" || x.enjeu_écologique === null) &&
    (typeof x.commentaire_enjeu === "string" || x.commentaire_enjeu === null) &&
    (typeof x.commentaire_libre === "string" || x.commentaire_libre === null) &&
    /*(isValidDateString(x.historique_date_réception_ddep) || x.historique_date_réception_ddep === null) &&
    (isValidDateString(x.historique_date_envoi_dernière_contribution) || x.historique_date_envoi_dernière_contribution === null) &&
    (typeof x.historique_identifiant_demande_onagre === "string" || x.historique_identifiant_demande_onagre === null) &&
    (isValidDateString(x.historique_date_saisine_csrpn) || x.historique_date_saisine_csrpn === null) &&
    (isValidDateString(x.historique_date_saisine_cnpn) || x.historique_date_saisine_cnpn === null) &&
    (isValidDateString(x.date_avis_csrpn) || x.date_avis_csrpn === null) &&
    (isValidDateString(x.date_avis_cnpn) || x.date_avis_cnpn === null) &&
    (typeof x.avis_csrpn_cnpn === "string" || x.avis_csrpn_cnpn === null) &&
    (isValidDateString(x.date_consultation_public) || x.date_consultation_public === null) &&
    (typeof x.historique_décision === "string" || x.historique_décision === null) &&
    (isValidDateString(x.historique_date_signature_arrêté_préfectoral) || x.historique_date_signature_arrêté_préfectoral === null) &&
    (typeof x.historique_référence_arrêté_préfectoral === "string" || x.historique_référence_arrêté_préfectoral === null) &&
    (isValidDateString(x.historique_date_signature_arrêté_ministériel) || x.historique_date_signature_arrêté_ministériel === null) &&
    (typeof x.historique_référence_arrêté_ministériel === "string" || x.historique_référence_arrêté_ministériel === null) &&
    */
    (typeof x.rattaché_au_régime_ae === "boolean" || x.rattaché_au_régime_ae === null) &&
    (typeof x.prochaine_action_attendue_par === "string" || x.prochaine_action_attendue_par === null)
  )
}

/**
 * 
 * @param {any} e 
 * @returns {e is OiseauAtteint} 
 */
export function isOiseauAtteint(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" && e.espèce.classification === "oiseau" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object") &&
    (e.méthode === undefined || typeof e.méthode === "object") &&
    (e.transport === undefined || typeof e.transport === "object") &&
    (e.nombreNids === undefined || typeof e.nombreNids === "number") &&
    (e.nombreOeufs === undefined || typeof e.nombreOeufs === "number")
  )
}

/**
 * 
 * @param {any} e 
 * @returns {e is FauneNonOiseauAtteinte} 
 */
export function isFauneNonOiseauAtteinte(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" && e.espèce.classification === "faune non-oiseau" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object") &&
    (e.méthode === undefined || typeof e.méthode === "object") &&
    (e.transport === undefined || typeof e.transport === "object")
  )
}

/**
 * 
 * @param {any} e 
 * @returns {e is FloreAtteinte} 
 */
export function isFloreAtteinte(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" && e.espèce.classification === "flore" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object")
  )
}