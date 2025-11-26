/** @import { default as AvisExpert, AvisExpertInitializer } from "../../types/database/public/AvisExpert" */

import { json, text } from "d3-fetch";


/**
 * Ajoute un ou plusieurs avis d'expert.
 * @param {AvisExpertInitializer | AvisExpertInitializer[]} avisExpert
 */
export function ajouterAvisExpert(avisExpert) {
    return json('/avis-expert',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(avisExpert)
            }
        )
}

/**
 * Supprime un avis d'expert.
 * @param {Pick<AvisExpert, "id">} avisExpert
 */
export function supprimerAvisExpert(avisExpert) {
    return text(`/avis-expert/${avisExpert.id}`, { method: 'DELETE'})
}