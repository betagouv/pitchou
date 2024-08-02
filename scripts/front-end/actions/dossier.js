//@ts-check

import store from "../store"

/** @typedef {import('../../types/database/public/Dossier').default} Dossier */

/**
 * @param {Dossier['id']} id 
 * @param {Partial<Dossier>} dossierParams
 * @returns {Promise<Dossier>}
 */
export function modifierDossier(id, dossierParams) {
    if(store.state.secret){
        return fetch(
            `/dossier/${id}?cap=${store.state.secret}`, 
            {
                method: "PUT",
                body: JSON.stringify({ dossierParams }),
            }
        )
        .then(response => {
            if (response.ok) { return response.json() }
            
            const { status, statusText } = response

            console.log(`${status} ${statusText}`)
        })
        .then(/** @type {Dossier} */ databaseResponse  => {
            const dossierAJour = databaseResponse[0]
            store.mutations.setDossier(dossierAJour)
            return dossierAJour
        })
        .catch((err) => console.log(err))
    }
    else{
        return Promise.reject(new TypeError('Impossible de modifier le dossier, secret manquant'))
    }
}