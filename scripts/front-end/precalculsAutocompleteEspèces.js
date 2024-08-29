/** @import {EspèceProtégée} from "../types.js" */

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