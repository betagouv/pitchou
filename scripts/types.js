
/** @import {default as Dossier} from './types/database/public/Dossier.ts' */

/**
 * @template T
 * @typedef { {[K in keyof T]: string} } StringValues
 */

/** @typedef { 'Animalia' | 'Plantae' | 'Fungi' | 'Chromista' } Règne // incomplet */
/** @typedef { 'Aves' | 'Amphibia' | 'Actinopterygii' | 'Malacostraca' | 'Mammalia' | 'Anthozoa' | 'Equisetopsida' | 'Gastropoda' | 'Insecta' | 'Bivalvia' | 'Petromyzonti' | 'Lecanoromycetes' | 'Ulvophyceae' | 'Holothuroidea' | 'Elasmobranchii' | 'Arachnida' | 'Charophyceae' | 'Cephalopoda' | 'Echinoidea' | 'Phaeophyceae' } Classe // incomplet */

/** 
 * Notre classification. Basée sur les directives européennes (oiseau, habitat, plantes)
 * @typedef {"oiseau" | "faune non-oiseau" | "flore"} ClassificationEtreVivant 
 */

/**
 * Lignes du fichier TAXREF.txt (INPN)
 * Il peut y avoir plusieurs lignes avec le même CD_REF (mais différents CD_NOM) si l'espèce a des synonymes 
 * 
 * @typedef {Object} TAXREF_ROW
 * @prop { string } CD_NOM 
 * @prop { string } CD_REF
 * @prop { string } LB_NOM 
 * @prop { string } NOM_VERN 
 * @prop { Classe } CLASSE 
 * @prop { Règne } REGNE 
 * // incomplet
 */

/**
 * Lignes du fichier BDC_STATUT.csv (INPN)
 * Il peut y avoir plusieurs lignes avec le même CD_NOM si l'espèce est protégées à plusieurs endroits
 *
 * @typedef {Object} BDC_STATUT_ROW
 * @prop { TAXREF_ROW['CD_NOM'] } CD_NOM 
 * @prop { TAXREF_ROW['CD_REF'] } CD_REF
 * @prop { 'POM' | 'PD' | 'PN' | 'PR' | 'Protection Pitchou' } CD_TYPE_STATUT
 * @prop { string } LABEL_STATUT
 * // incomplet
 */



/**
 * Lignes du fichier liste-espèces-protégées.csv
 * Il peut y avoir plusieurs lignes avec le même CD_REF (mais différents CD_NOM) si l'espèce a des synonymes 
 * 
 * @typedef {Object} EspèceProtégée
 * @prop { TAXREF_ROW['CD_REF'] } CD_REF
 * @prop { Set<TAXREF_ROW['NOM_VERN']> } nomsVernaculaires - TAXREF_ROW['NOM_VERN'] contient parfois plusieurs noms. Ils sont séparés dans le set
 * @prop { Set<TAXREF_ROW['LB_NOM']> } nomsScientifiques - plusieurs noms si plusieurs CD_NOM pour le même CD_REF
 * @prop { ClassificationEtreVivant } classification
 * @prop { Set<BDC_STATUT_ROW['CD_TYPE_STATUT']> } CD_TYPE_STATUTS
 */


/** 
 * Les Set<string> deviennent des string séparés par des `,`
 * @typedef {StringValues<EspèceProtégée>} EspèceProtégéeStrings 
 */


/** 
 * @typedef { Object } ActivitéMenançante
 * @prop {string} Code
 * @prop {ClassificationEtreVivant} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 * @prop {'o' | 'n'} Méthode
 * @prop {'o' | 'n'} transport
 */
/** 
 * @typedef { Object } MéthodeMenançante
 * @prop {string} Code
 * @prop {ClassificationEtreVivant} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 */
/** 
 * @typedef { Object } TransportMenançant
 * @prop {string} Code
 * @prop {ClassificationEtreVivant} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 */


/**
 * @typedef {Object} EtreVivantAtteint
 * @prop { EspèceProtégée } espèce
 * @prop { string } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 * @prop { ActivitéMenançante } [activité]
 * @prop { MéthodeMenançante } [méthode]
 * @prop { TransportMenançant } [transport]
 */

/**
 * @typedef {Object} EtreVivantAtteintJSON
 * @prop { EspèceProtégée['CD_REF'] } espèce
 * @prop { EspèceProtégée['CD_REF'] } [espece] // @deprecated
 * @prop { string } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 * @prop { string } [activité] // Code
 * @prop { string } [méthode] // Code
 * @prop { string } [transport] // Code
 */

/**
 * @typedef {Object} OiseauAtteintSpecifique
 * @prop { number } nombreNids
 * @prop { number } nombreOeufs
 */

/** @typedef {EtreVivantAtteint & OiseauAtteintSpecifique} OiseauAtteint */
/** @typedef {EtreVivantAtteintJSON & OiseauAtteintSpecifique} OiseauAtteintJSON */


/**
 * @typedef {Object} DescriptionMenaceOiseau
 * @prop { "oiseau" } classification
 * @prop { OiseauAtteint[] } etresVivantsAtteints
 */

/**
 * @typedef {Object} DescriptionMenaceNonOiseau
 * @prop { "faune non-oiseau" | "flore" } classification
 * @prop { EtreVivantAtteint[] } etresVivantsAtteints
 */

/**
 * @typedef {DescriptionMenaceOiseau | DescriptionMenaceNonOiseau} DescriptionMenaceEspèce
 */

/**
 * @typedef {Object} DescriptionMenaceEspèceJSON
 * @prop { ClassificationEtreVivant } classification
 * @prop { (OiseauAtteintJSON | EtreVivantAtteintJSON)[] } etresVivantsAtteints
 */
/** @typedef {DescriptionMenaceEspèceJSON[]} DescriptionMenaceEspècesJSON */

/** @typedef {string} NomGroupeEspèces */
/**
 * @typedef {Object} EspèceSimplifiée
 * @prop { EspèceProtégée['CD_REF'] } CD_REF
 * @prop { string } nom
 */
/** @typedef {Record<NomGroupeEspèces, (EspèceSimplifiée | string)[]>} GroupesEspèces */



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
 * @typedef {"accompagnement amont" | "accompagnement amont terminé" | "instruction" | "décision" | "refus tacite" | null} DossierPhase
 
 * @typedef {"instructeur" | "CNPN/CSRPN" | "pétitionnaire" | "consultation du public" | "autre administration" | "sans objet" |  null} DossierProchaineActionAttenduePar
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