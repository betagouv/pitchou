/** @import { default as AvisExpert, AvisExpertInitializer } from "../../types/database/public/AvisExpert" */

import { json, text } from "d3-fetch";


/**
 * Ajoute un avis d'expert.
 * @param {AvisExpertInitializer} avisExpert
 * @param {File | undefined} [fileFichierSaisine]
 */
export function ajouterAvisExpert(avisExpert, fileFichierSaisine) {
    const form = new FormData();

    form.append("stringifyAvisExpert", JSON.stringify(avisExpert));

    if (fileFichierSaisine) {
        form.append("blobFichierSaisine", fileFichierSaisine);
    }

    return json('/avis-expert', 
        { 
            method: 'POST',
            body: form 
        })
}

/**
 * Supprime un avis d'expert.
 * @param {Pick<AvisExpert, "id">} avisExpert
 */
export function supprimerAvisExpert(avisExpert) {
    return text(`/avis-expert/${avisExpert.id}`, { method: 'DELETE'})
}