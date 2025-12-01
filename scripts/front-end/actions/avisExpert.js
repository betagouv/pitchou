/** @import { default as AvisExpert, AvisExpertInitializer } from "../../types/database/public/AvisExpert" */

import { json, text } from "d3-fetch";


/**
 * Ajoute un avis d'expert.
 * 
 * @param {AvisExpertInitializer} avisExpert
 * @param {File | undefined} [fileFichierSaisine]
 * @param {File | undefined} [fileFichierAvis]
 */
export function ajouterAvisExpert(avisExpert, fileFichierSaisine, fileFichierAvis) {
    const form = new FormData();

    form.append("stringifyAvisExpert", JSON.stringify(avisExpert));

    if (fileFichierSaisine) {
        form.append("blobFichierSaisine", fileFichierSaisine);
    }

    if (fileFichierAvis) {
        form.append("blobFichierAvis", fileFichierAvis);
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