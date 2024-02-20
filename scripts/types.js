/** @typedef { 1 | 2 | 3 | 4 | 5 | 60 | 70 } ActivitéMenançante // tous */
/** @typedef { 0 | 1 | 2 | 10 | 11 | 12 | 13 | 14 } MéthodeMenançante // tous */
/** @typedef { 'Animalia' | 'Plantae' | 'Fungi' | 'Chromista' } Règne // incomplet */
/** @typedef { 'Amphibia' | 'Actinopterygii' | 'Malacostraca' | 'Mammalia' | 'Aves' | 'Anthozoa' | 'Equisetopsida' | 'Gastropoda' | 'Insecta' | 'Bivalvia' | 'Petromyzonti' | 'Lecanoromycetes' | 'Ulvophyceae' | 'Holothuroidea' | 'Elasmobranchii' | 'Arachnida' | 'Charophyceae' | 'Cephalopoda' | 'Echinoidea' | 'Phaeophyceae' } Classe // incomplet */


/**
 * @typedef {"oiseau" | "faune non-oiseau" | "flore"} ClassificationEtreVivant
 */

/**
 * @typedef {Object} EtreVivantAtteint
 * @prop { string } espece // identifiant type CD_NOM ? pérénité ?
 * @prop { number } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 */

/**
 * @typedef {Object} OiseauAtteintSpecifique
 * @prop { number } nombreNids
 * @prop { number } nombreOeufs
 */

/** @typedef {EtreVivantAtteint & OiseauAtteintSpecifique} OiseauAtteint */

/**
 * @typedef {Object} DescriptionMenaceEspèce
 * @prop { ClassificationEtreVivant } classification
 * @prop { (OiseauAtteint | EtreVivantAtteint)[] } etresVivantsAtteints
 * @prop { ActivitéMenançante } activité
 * @prop { MéthodeMenançante } méthode
 * @prop { boolean } transport
 */
