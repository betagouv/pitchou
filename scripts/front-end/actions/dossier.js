//@ts-check

import store from "../store"

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierComplet} from '../../types.js' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */

/**
 * @param {DossierComplet['id']} id
 * @param {Partial<DossierComplet>} dossierParams
 * @returns {Promise<Dossier>}
 */
export function modifierDossier(id, dossierParams) {
    if(!store.state.capabilities?.modifierDossier)
        throw new TypeError(`Capability modifierDossier manquante`)

    return store.state.capabilities?.modifierDossier(id, dossierParams)
        .then(databaseResponse  => {
            //@ts-ignore 
            const dossierAJour = databaseResponse[0]
            store.mutations.setDossier(dossierAJour)
            return dossierAJour
        })
}