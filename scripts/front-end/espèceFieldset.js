/** @import {
 *    EspèceProtégée, 
 *    OiseauAtteint, 
 *    FauneNonOiseauAtteinte, 
 *    FloreAtteinte
 * } from "../types/especes" */

/**
 * 
 * @param {EspèceProtégée} espèce
 */
export function espèceLabel(espèce){
    return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`
}

/**
 * 
 * @param {EspèceProtégée[]} espèces
 */
export function makeEspèceToLabel(espèces){
    return new Map(espèces.map(e => [e, espèceLabel(e)]))
}

/**
 * 
 * @param {EspèceProtégée[]} espèces
 */
export function makeEspèceToKeywords(espèces){
    return new Map(espèces.map(e => [e, [...e.nomsVernaculaires, ...e.nomsScientifiques].join(' ')]))
}

/**
 * 
 * @param {OiseauAtteint|FauneNonOiseauAtteinte|FloreAtteinte} _
 * @param {OiseauAtteint|FauneNonOiseauAtteinte|FloreAtteinte} _
 */
export function etresVivantsAtteintsCompareEspèce({espèce: {nomsScientifiques: noms1}}, {espèce: {nomsScientifiques: noms2}}) {
    const [nom1] = noms1
    const [nom2] = noms2

    if (nom1 < nom2) {
        return -1;
    }
    if (nom1 > nom2) {
        return 1;
    }
    return 0;
}


/**
 * Les fourchettes sont des chaînes de caractères toujours au format 'x-y' où x et y sont des integer
 */
/** @type {string[]}*/
export const fourchettesIndividus = [
    '0-10',
    '11-100',
    '101-1000',
    '1001-10000',
    '10001+'
]