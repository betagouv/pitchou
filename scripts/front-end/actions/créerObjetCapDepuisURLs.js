//@ts-check

import {json} from 'd3-fetch'

//@ts-expect-error TS ne comprend pas que c'est utilisé
/** @import {StringValues} from '../../types/tools.d.ts' */
//@ts-expect-error TS ne comprend pas que c'est utilisé
/** @import {IdentitéInstructeurPitchou, PitchouInstructeurCapabilities} from '../../types/capabilities.ts' */
//@ts-expect-error TS ne comprend pas que c'est utilisé
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-expect-error TS ne comprend pas que c'est utilisé
/** @import {default as Message} from '../../types/database/public/Message.ts' */

/**
 * 
 * @param {string | undefined} url 
 * @returns {(() => Promise<any>) | undefined}
 */
function wrapGETUrl(url){
    if(!url)
        return undefined

    return () => json(url)
}

/**
 * 
 * @param {string | undefined} url 
 * @returns {((body: any) => Promise<any>) | undefined}
 */
function wrapPOSTUrl(url){
    if(!url)
        return undefined

    return (/** @type {any} */ args) => json(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    })
}

const dossierIdURLParam = ':dossierId'

/**
 * 
 * @param {string | undefined} url 
 * @returns {((dossierId: Dossier['id'], body: any) => Promise<any>) | undefined}
 */
function wrapModifierDossier(url){
    if(!url)
        return undefined

    if(!url.includes(dossierIdURLParam)){
        throw new Error(`La capability modifierDossier ne contient pas '${dossierIdURLParam}'`)
    }

    /**
     * 
     * @param {Dossier['id']} dossierId 
     * @param {any} args 
     * @returns 
     */
    function modifierDossier(dossierId, args){
        console.log('modifierDossier cap', args)

        return json(
            // @ts-ignore
            url.replace(dossierIdURLParam, dossierId), 
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args)
            }
        )
    }

    return modifierDossier
}


/**
 * 
 * @param {string | undefined} url 
 * @returns {((dossierId: Dossier['id']) => Promise<Message[]>) | undefined}
 */
function wrapListerMessages(url){
    if(!url)
        return undefined

    if(!url.includes(dossierIdURLParam)){
        throw new Error(`La capability listerMessages ne contient pas '${dossierIdURLParam}'`)
    }

    /**
     * 
     * @param {Dossier['id']} dossierId
     * @returns {Promise<Message[]>}
     */
    return function listerMessages(dossierId){
        // @ts-ignore
        return json(url.replace(dossierIdURLParam, dossierId))
    }
}

/**
 * 
 * @param {StringValues<PitchouInstructeurCapabilities> & {identité: IdentitéInstructeurPitchou}} capURLs 
 * @returns {Partial<PitchouInstructeurCapabilities> & {identité: IdentitéInstructeurPitchou}}
 */
export default function(capURLs){

    return {
        listerDossiers: wrapGETUrl(capURLs.listerDossiers),
        listerRelationSuivi: wrapGETUrl(capURLs.listerRelationSuivi),
        listerÉvènementsPhaseDossier: wrapGETUrl(capURLs.listerÉvènementsPhaseDossier),
        listerMessages: wrapListerMessages(capURLs.listerMessages),
        modifierDossier: wrapModifierDossier(capURLs.modifierDossier),
        remplirAnnotations: wrapPOSTUrl(capURLs.remplirAnnotations),
        identité: capURLs.identité
    }

}