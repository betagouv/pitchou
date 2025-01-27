//@ts-check

import store from "../store"

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierComplet, DossierPhase} from '../../types/API_Pitchou.d.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */

/**
 * @param {DossierComplet} dossier
 * @param {Partial<DossierComplet>} modifs
 * @returns {Promise<void>}
 */
export function modifierDossier(dossier, modifs) {
    if(!store.state.capabilities.modifierDossier)
        throw new TypeError(`Capability modifierDossier manquante`)

    // modifier le dossier dans le store de manière optimiste
    /** @type {DossierComplet} */
    const dossierModifié = Object.assign({}, dossier, modifs)
    if(modifs.évènementsPhase){
        dossierModifié.évènementsPhase = [
            ...modifs.évènementsPhase,
            ...dossier.évènementsPhase
        ]
    }

    store.mutations.setDossierComplet(dossierModifié)

    return store.state.capabilities.modifierDossier(dossier.id, modifs)
        .catch(err  => {
            // en cas d'erreur, remettre le dossier précédent dans le store comme avant la copie
            store.mutations.setDossierComplet(dossier)
            throw err
        })
}

/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<Message[]>}
 */
export async function chargerMessagesDossier(id){
    if(!store.state.capabilities?.listerMessages)
        throw new TypeError(`Capability listerMessages manquante`)

    const messagesP = store.state.capabilities?.listerMessages(id)
        .then((/** @type {Message[]} */ messages)  => {
            store.mutations.setMessages(id, messages)
            return messages
        })

    return store.state.messagesParDossierId.get(id) || messagesP
}


/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<DossierComplet>}
 */
export async function getDossierComplet(id){
    const dossierCompletInStore = store.state.dossiersComplets.get(id)

    if(dossierCompletInStore){
        return dossierCompletInStore
    }

    if(!store.state.capabilities.recupérerDossierComplet)
        throw new TypeError(`Capability recupérerDossierComplet manquante`)

    const dossierComplet = await store.state.capabilities.recupérerDossierComplet(id)
    store.mutations.setDossierComplet(dossierComplet)
    
    return dossierComplet
}