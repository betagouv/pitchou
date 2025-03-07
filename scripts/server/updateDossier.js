import { updateDossier as updateDossierDatabase } from './database/dossier.js'

/** @import {default as Dossier} from '../types/database/public/Dossier.js' */
/** @import {default as Personne} from '../types/database/public/Personne.js' */
/** @import {default as ÉvènementPhaseDossier} from '../types/database/public/ÉvènementPhaseDossier.js' */

/**
 *
 * @param {Dossier['id']} id
 * @param {Partial<Dossier & {évènementsPhase: ÉvènementPhaseDossier[]}>} dossierParams
 * @param {Personne['id']} causePersonne
 * @returns {Promise<any>}
 */
export default function updateDossier(id, dossierParams, causePersonne) {
    let phaseAjoutée = Promise.resolve()

    if(dossierParams.évènementsPhase){
        for(const ev of dossierParams.évènementsPhase){
            ev.cause_personne = causePersonne
        }

        phaseAjoutée = databaseConnection('évènement_phase_dossier')
            .insert(dossierParams.évènementsPhase)

        delete dossierParams.évènementsPhase
    }

    let dossierÀJour = Promise.resolve()

    if(Object.keys(dossierParams).length >= 1){
        dossierÀJour = databaseConnection('dossier')
            .where({ id })
            .update(dossierParams)
    }

    return Promise.all([phaseAjoutée, dossierÀJour])
}