/** @typedef { 1 | 2 | 3 | 4 | 5 | 60 | 70 } ActivitéMenançante // tous */
/** @typedef { 0 | 1 | 2 | 10 | 11 | 12 | 13 | 14 } MéthodeMenançante // tous */

/**
 * @typedef {Object} EtreVivantAtteint
 * @prop { string } espece // identifiant type CD_NOM ? pérénité ?
 * @prop { number } nombreIndividus
 */

/**
 * @typedef {Object} OiseauAtteintSpecifique
 * @prop { number } nombreNids
 * @prop { number } nombreOeufs
 */

/** @typedef {EtreVivantAtteint & OiseauAtteintSpecifique} OiseauAtteint */

/**
 * @typedef {Object} DescriptionMenaceEspèce
 * @prop { "oiseau" | "faune non-oiseau" | "flore" } type
 * @prop { (OiseauAtteint | EtreVivantAtteint)[] } etresVivantsAtteints
 * @prop { number } surfaceHabitatDétruit
 * @prop { ActivitéMenançante } activité
 * @prop { MéthodeMenançante } méthode
 * @prop { boolean } transport
 */
