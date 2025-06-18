import {text, json} from 'd3-fetch'

/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Partial<Prescription>} prescription 
 * @returns {Promise<Prescription['id'] | undefined>}
 */
export function ajouterModifierPrescription(prescription){
    return json('/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prescription)
    })
}

/**
 * 
 * @param {Prescription['id']} id
 * @returns {Promise<any>}
 */
export function supprimerPrescription(id){
    return text(`/prescription/${id}`, {method: 'DELETE'})
}


