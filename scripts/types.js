
/** @import {default as Dossier} from './types/database/public/Dossier.ts' */

/**
 * @template T
 * @typedef { {[K in keyof T]: string} } StringValues
 */

/** 
 * https://geo.api.gouv.fr/communes
 *
 * @typedef {Object} GeoAPICommune
 * @prop {string} nom
 * @prop {string} code
 * @prop {string} codeDepartement
 * @prop {string} codeRegion
 * @prop {string[]} codesPostaux
 * @prop {string} siren
 * @prop {string} codeEpci
 * @prop {string} nom
 * @prop {number} population
 * 
 */


/**
 * @typedef {Object} DossierComplémentPersonnesImpliquées
 * @property {string} nom_dossier
 * @property {string} déposant_nom
 * @property {string} déposant_prénoms
 * @property {string} demandeur_personne_physique_nom
 * @property {string} demandeur_personne_physique_prénoms
 * @property {string} demandeur_personne_morale_raison_sociale
 * @property {string} demandeur_personne_morale_siret
 * 
 */ 

/** 
 * On génère automatiquement les types des propriétés d'un Dossier via Kanel
 * On a choisi d'utiliser un type `string` pour les propriétés
 * 'phase', 'prochaine_action_attendue_par' et 'prochaine_action_attendue' 
 * pour plus de flexibilité (au lieu d'un enum).
 * 
 * On surcharge ici ces propriétés pour contraindre les valeurs de ces propriétés.
 * 
 * @typedef {"Accompagnement amont" | "Instruction" | "Contrôle" | "Classé sans suite" | "Obligations terminées" | null} DossierPhase
 
 * @typedef {"Instructeur" | "CNPN/CSRPN" | "Pétitionnaire" | "Consultation du public" | "Autre administration" | "Autre" | "Personne" } DossierProchaineActionAttenduePar
 *
 * @typedef {"traitement" |"lancement consultation" | "rédaction AP" | "Avis" | "DDEP" | "complément dossier" | "mémoire en réponse avis CNPN" | "à préciser" | "Prise en compte des mesures E et R" | null} DossierProchaineActionAttendue
 * 
 * @typedef {Object} DossierPhaseEtProchaineAction
 * @property {DossierPhase} phase
 * @property {DossierProchaineActionAttenduePar} prochaine_action_attendue_par
 * @property {DossierProchaineActionAttendue} prochaine_action_attendue
*/

/**
 * Kanel génère un type `unknown` pour les champs JSON. 
 * 
 * On surcharge ici les propriétés `communes`, `départements` et `régions` pour contraindre le type des valeurs du JSON.
 * 
 * @typedef {Object} DossierDémarcheSimplifiée88444Communes
 * @property {string} name
 * @property {string} code
 * @property {string} postalCode
 * 
 * @typedef {Object} DossierLocalisation
 * @property {DossierDémarcheSimplifiée88444Communes[]} communes
 * @property {string[] | null | undefined} départements
 * @property {string[] | null | undefined} régions
 */

/** @typedef {Dossier & DossierComplémentPersonnesImpliquées & DossierPhaseEtProchaineAction & DossierLocalisation} DossierComplet */


export default 'TS needs a module'