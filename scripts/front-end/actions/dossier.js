//@ts-check

import {json} from 'd3-fetch'

import store from "../store"

/** @import {DossierComplet} from '../../types.js' */
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */

/**
 * @param {DossierComplet['id']} id
 * @param {Partial<DossierComplet>} dossierParams
 * @returns {Promise<Dossier>}
 */
export function modifierDossier(id, dossierParams) {
    if(store.state.secret){
        return json(
            `/dossier/${id}?cap=${store.state.secret}`, 
            {
                method: "PUT",
                body: JSON.stringify({ dossierParams }),
            }
        )
        .then(databaseResponse  => {
            //@ts-ignore 
            const dossierAJour = databaseResponse[0]
            store.mutations.setDossier(dossierAJour)
            return dossierAJour
        })
    }
    else{
        return Promise.reject(new TypeError('Impossible de modifier le dossier, secret manquant'))
    }
}