import {text} from 'd3-fetch'

/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Prescription['id']} id
 * @returns {Promise<any>}
 */
export function supprimerPrescription(id){
    return text(`/prescription/${id}`, {method: 'DELETE'})
}