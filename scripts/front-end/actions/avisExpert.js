/** @import { default as AvisExpert, AvisExpertInitializer } from "../../types/database/public/AvisExpert" */
/** @import { FrontEndAvisExpert } from '../../types/API_Pitchou.js' */

import { json, text } from "d3-fetch";


/**
 * Ajoute un avis d'expert.
 * 
 * @param {Pick<FrontEndAvisExpert, "dossier"> & Partial<FrontEndAvisExpert>} frontEndAvisExpert
 * @param {File | undefined} [fileFichierSaisine]
 * @param {File | undefined} [fileFichierAvis]
 * @returns {Promise<void>}
 */
export function ajouterOuModifierAvisExpert(frontEndAvisExpert, fileFichierSaisine, fileFichierAvis) {
    const form = new FormData();

    const copyFrontEndAvisExpert = Object.assign({}, frontEndAvisExpert)

    delete copyFrontEndAvisExpert.avis_fichier_url
    delete copyFrontEndAvisExpert.saisine_fichier_url
    
    /**@type {Pick<AvisExpert, "dossier"> & AvisExpertInitializer} */
    const avisExpert = {...copyFrontEndAvisExpert}

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