import {text, json} from 'd3-fetch'

import {envoyerÉvènement, envoyerÉvènementModifierPrescription} from './aarri.js'

/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */
/** @import {FrontEndPrescription} from '../../types/API_Pitchou.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Partial<Prescription>} prescription 
 * @returns {Promise<Prescription['id']>}
 */
export function ajouterPrescription(prescription){
    envoyerÉvènement({type: 'ajouterPrescription'})    
    
    //@ts-ignore
    return json('/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prescription)
    })
}

/**
 * 
 * @param {Omit<FrontEndPrescription, 'id'>[]} prescription 
 */
export function ajouterPrescriptionsEtContrôles(prescription){
    envoyerÉvènement({type: 'ajouterPrescription'})
    envoyerÉvènement({type: 'ajouterContrôle'})

    return text('/prescriptions-et-contrôles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prescription)
    })
}

/**
 * 
 * @param {Partial<Prescription>} prescription 
 * @returns {Promise<undefined>}
 */
export function modifierPrescription(prescription){
    envoyerÉvènementModifierPrescription()
    
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
    envoyerÉvènement({type: 'supprimerPrescription'})  

    return text(`/prescription/${id}`, {method: 'DELETE'})
}


