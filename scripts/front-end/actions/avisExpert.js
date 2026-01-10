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

    // Dans un objet FormData, la valeur de la clef ne peut être qu'un string ou un Blob,
    // et dossier est de type number & {__brand: "public.dossier";}
    // @ts-ignore
    form.append("dossier", avisExpert.dossier);

    // Dans le cas d'une modification, 
    // on fournit l'id de l'avis d'expert
    if (avisExpert.id) {
        form.append("id", avisExpert.id);
    }

    if (avisExpert.avis) {
        form.append("avis", avisExpert.avis);
    }

    if (avisExpert.date_avis) {
        form.append("date_avis", avisExpert.date_avis.toJSON());
    }

    if (avisExpert.expert) {
        form.append("expert", avisExpert.expert);
    }

    if (avisExpert.date_saisine) {
        form.append("date_saisine", avisExpert.date_saisine.toJSON());
    }

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