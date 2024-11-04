//@ts-check

import store from "../store"

/** @import {DossierComplet} from '../../types.js' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */

/**
 * @param {DossierComplet['id']} id
 * @param {Partial<DossierComplet>} dossierParams
 * @returns {Promise<void>}
 */
export function modifierDossier(id, dossierParams) {
    if(!store.state.capabilities?.modifierDossier)
        throw new TypeError(`Capability modifierDossier manquante`)

    const dossierAvantModification = store.state.dossiers.get(id)
    const copieDossierAvantModification = Object.assign({}, dossierAvantModification)

    // modifier le dossier dans le store de manière optimiste
    const dossierModifié = Object.assign({}, dossierAvantModification, dossierParams)
    store.mutations.setDossier(dossierModifié)

    return store.state.capabilities?.modifierDossier(id, dossierParams)
        .catch(err  => {
            // en cas d'erreur, remettre le dossier dans le store comme avant la copie
            store.mutations.setDossier(copieDossierAvantModification)
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