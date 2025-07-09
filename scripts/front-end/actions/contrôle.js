import {text, json} from 'd3-fetch'

/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Partial<Contrôle>} contrôle 
 * @returns {Promise<Contrôle['id']>}
 */
export function ajouterContrôle(contrôle){
    //@ts-ignore
    return json('/contrôle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contrôle)
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
 * @returns {Promise<any>}
 */
export function supprimerContrôle(id){
    return text(`/contrôle/${id}`, {method: 'DELETE'})
}


