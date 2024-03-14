/** 
 * @typedef { Object } ActivitéMenançante
 * @prop {string} Code
 * @prop {string} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 * @prop {'o' | 'n'} Méthode
 * @prop {'o' | 'n'} transport
 */
/** 
 * @typedef { Object } MéthodeMenançante
 * @prop {string} Code
 * @prop {string} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 */
/** 
 * @typedef { Object } TransportMenançant
 * @prop {string} Code
 * @prop {string} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 */



/** @typedef { 'Animalia' | 'Plantae' | 'Fungi' | 'Chromista' } Règne // incomplet */
/** @typedef { 'Amphibia' | 'Actinopterygii' | 'Malacostraca' | 'Mammalia' | 'Aves' | 'Anthozoa' | 'Equisetopsida' | 'Gastropoda' | 'Insecta' | 'Bivalvia' | 'Petromyzonti' | 'Lecanoromycetes' | 'Ulvophyceae' | 'Holothuroidea' | 'Elasmobranchii' | 'Arachnida' | 'Charophyceae' | 'Cephalopoda' | 'Echinoidea' | 'Phaeophyceae' } Classe // incomplet */


/**
 * @typedef {"oiseau" | "faune non-oiseau" | "flore"} ClassificationEtreVivant
 */

/**
 * @typedef {Object} Espèce
 * @prop { string } CD_NOM // pérennité ?
 * @prop { Règne } CLASSE 
 * @prop { Classe } REGNE 
 * 
 */

/**
 * @typedef {Object} EtreVivantAtteint
 * @prop { Espèce } espece
 * @prop { string } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 */

/**
 * @typedef {Object} EtreVivantAtteintJSON
 * @prop { string } espece // CD_NOM 
 * @prop { string } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 */

/**
 * @typedef {Object} OiseauAtteintSpecifique
 * @prop { number } nombreNids
 * @prop { number } nombreOeufs
 */

/** @typedef {EtreVivantAtteint & OiseauAtteintSpecifique} OiseauAtteint */
/** @typedef {EtreVivantAtteintJSON & OiseauAtteintSpecifique} OiseauAtteintJSON */

/**
 * @typedef {Object} DescriptionMenaceEspèce
 * @prop { ClassificationEtreVivant } classification
 * @prop { (OiseauAtteint | EtreVivantAtteint)[] } etresVivantsAtteints
 * @prop { ActivitéMenançante } activité
 * @prop { MéthodeMenançante } méthode
 * @prop { TransportMenançant } transport
 */

/**
 * @typedef {Object} DescriptionMenaceEspèceJSON
 * @prop { ClassificationEtreVivant } classification
 * @prop { (OiseauAtteintJSON | EtreVivantAtteintJSON)[] } etresVivantsAtteints
 * @prop { string } activité // Code
 * @prop { string } méthode // Code
 * @prop { string } transport // Code
 */
/** @typedef {DescriptionMenaceEspèceJSON[]} DescriptionMenaceEspècesJSON */