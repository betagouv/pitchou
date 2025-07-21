import {text, json} from 'd3-fetch'

/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */
/** @import {RésultatContrôle, TypesActionSuiteContrôle} from '../../types/API_Pitchou.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/** @type {Set<RésultatContrôle>} */
export const résultatsContrôle = new Set([
    "Conforme", "Non conforme", "Trop tard", "En cours","Non conforme (Pas d'informations reçues)"
])

/** @type {Set<TypesActionSuiteContrôle>} */
export const typesActionSuiteContrôle = new Set([
    "Email", "Courrier", "Courrier recommandé avec accusé de réception"
])


/**
 * 
 * @param {Partial<Contrôle> | Partial<Contrôle>[]} contrôles 
 * @returns {Promise<Contrôle['id'][]>}
 */
export function ajouterContrôles(contrôles){
    //@ts-ignore
    return json('/contrôle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contrôles)
    })

}

/**
 * 
 * @param {Partial<Contrôle>} contrôle 
 * @returns {Promise<undefined>}
 */
export function modifierContrôle(contrôle){
    return json('/contrôle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contrôle)
    })
}

/**
 * 
 * @param {Contrôle['id']} id
 * @returns {Promise<unknown>}
 */
export function supprimerContrôle(id){
    return text(`/contrôle/${id}`, {method: 'DELETE'})
}


