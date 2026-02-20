//@ts-check

import {json, text} from 'd3-fetch'

/** @import {StringValues} from '../../types/tools.d.ts' */
/** @import {IdentitéInstructeurPitchou, PitchouInstructeurCapabilities} from '../../types/capabilities.ts' */
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
/** @import {default as Message} from '../../types/database/public/Message.ts' */
/** @import {DossierComplet} from '../../types/API_Pitchou.ts' */


const commonHeaders = {
    'Accept': 'application/json'
}

const commonRequestInit = {headers: commonHeaders}

/**
 *
 * @param {string | undefined} url
 * @returns {(() => Promise<any>) | undefined}
 */
function wrapGETUrl(url){
    if(!url)
        return undefined

    return () => json(url, commonRequestInit)
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

/**
 *
 * @param {string | undefined} url
 * @returns {((body: any) => Promise<any>) | undefined}
 */
/*function wrapDELETEUrl(url){
    if(!url)
        return undefined

    return () => json(url, {method: 'DELETE'})
}*/



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
        return json(url.replace(dossierIdURLParam, dossierId), commonRequestInit)
    }
}

/**
 *
 * @param {string | undefined} url
 * @returns {((dossierId: Dossier['id']) => Promise<DossierComplet>) | undefined}
 */
function wrapRecupérerDossierComplet(url){
    if(!url)
        return undefined

    if(!url.includes(dossierIdURLParam)){
        throw new Error(`La capability listerMessages ne contient pas '${dossierIdURLParam}'`)
    }

    /**
     * @description Récupère les données du dossier et les formatte.
     * @param {Dossier['id']} dossierId
     * @returns {Promise<DossierComplet>}
     */
    return async function getDossierComplet(dossierId){
        /** @type {Awaited<ReturnType<getDossierComplet>> | undefined} */
        const ret = await json(
            // @ts-ignore
            url.replace(dossierIdURLParam, dossierId),
            commonRequestInit
        )

        if(!ret){
            throw new TypeError(`Aucun dossier trouvé avec id '${dossierId}'`)
        }

        // Formattage des dates
        if (ret.date_début_intervention) {
            ret.date_début_intervention = new Date(ret.date_début_intervention)
        }
        if (ret.date_fin_intervention) {
            ret.date_fin_intervention = new Date(ret.date_fin_intervention)
        }
        if (ret.date_dépôt) {
            ret.date_dépôt = new Date(ret.date_dépôt)
        }

        // Le contenu du fichier espèces impactées est disponible sous forme de string base64 dans le JSON
        // le retransformer en ArrayBuffer pour utilisation côté front-end
        if(ret.espècesImpactées){
            // @ts-ignore
            ret.espècesImpactées.contenu = Uint8Array.from(atob(ret.espècesImpactées.contenu), c => c.charCodeAt(0)).buffer
        }

        if(ret.espècesImpactées){
            Object.freeze(ret.espècesImpactées)
        }
        if(ret.évènementsPhase){
            Object.freeze(ret.évènementsPhase)
        }

        // les dates récupérées du JSON sont des string
        // ici, on les re-transforme en Dates
        if(ret.décisionsAdministratives){
            ret.décisionsAdministratives = ret.décisionsAdministratives.map(décisionAdministrative => {
                if(décisionAdministrative.date_signature){
                    décisionAdministrative.date_signature = new Date(décisionAdministrative.date_signature)
                }
                if(décisionAdministrative.date_fin_obligations){
                    décisionAdministrative.date_fin_obligations = new Date(décisionAdministrative.date_fin_obligations)
                }

                if(Array.isArray(décisionAdministrative.prescriptions)){
                    for(const p of décisionAdministrative.prescriptions){
                        if(p.date_échéance)
                            p.date_échéance = new Date(p.date_échéance)

                        if(Array.isArray(p.contrôles)){
                            for(const contrôle of p.contrôles){
                                if(contrôle.date_contrôle){
                                    contrôle.date_contrôle = new Date(contrôle.date_contrôle)
                                }
                                if(contrôle.date_action_suite_contrôle){
                                    contrôle.date_action_suite_contrôle = new Date(contrôle.date_action_suite_contrôle)
                                }
                                if(contrôle.date_prochaine_échéance){
                                    contrôle.date_prochaine_échéance = new Date(contrôle.date_prochaine_échéance)
                                }
                            }
                        }
                    }
                }

                return décisionAdministrative
            })
        }

        Object.freeze(ret)

        return ret;
    }
}

/**
 *
 * @param {string | undefined} url
 * @returns {((body: any) => Promise<any>) | undefined}
 */
function wrapModifierDécisionAdministrative(url){
    if(!url)
        return undefined

    return (/** @type {any} */ args) => text(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    })

}

/**
 *
 * @param {string | undefined} url
 * @returns {PitchouInstructeurCapabilities['modifierRelationSuivi'] | undefined}
 */
function wrapModifierRelationSuivi(url){
    if(!url)
        return undefined

    return function modifierRelationSuivi(direction, personneEmail, dossierId){

        return text(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                direction,
                personneEmail,
                dossierId
            })
        })
        .then(() => undefined)

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
        recupérerDossierComplet: wrapRecupérerDossierComplet(capURLs.recupérerDossierComplet),
        listerRelationSuivi: wrapGETUrl(capURLs.listerRelationSuivi),
        modifierRelationSuivi: wrapModifierRelationSuivi(capURLs.modifierRelationSuivi),
        listerÉvènementsPhaseDossier: wrapGETUrl(capURLs.listerÉvènementsPhaseDossier),
        listerMessages: wrapListerMessages(capURLs.listerMessages),
        modifierDossier: wrapModifierDossier(capURLs.modifierDossier),
        remplirAnnotations: wrapPOSTUrl(capURLs.remplirAnnotations),
        modifierDécisionAdministrativeDansDossier: wrapModifierDécisionAdministrative(capURLs.modifierDécisionAdministrativeDansDossier),
        créerÉvènementMetrique: wrapPOSTUrl(capURLs.créerÉvènementMetrique),
        identité: capURLs.identité,
        listerNotifications: wrapGETUrl(capURLs.listerNotifications),
        updateNotificationForDossier: wrapPOSTUrl(capURLs.updateNotificationForDossier)
    }

}
