import { updateDossier as updateDossierDatabase } from './database/dossier.js'
import {ajouterÉvènementsPhaseDossier} from './database/évènement_phase_dossier.js'

/** @import {default as Dossier} from '../types/database/public/Dossier.js' */
/** @import {default as Personne} from '../types/database/public/Personne.js' */
/** @import {default as ÉvènementPhaseDossier} from '../types/database/public/ÉvènementPhaseDossier.js' */

// TypeScript produit des faux warning de non-utilisation https://github.com/microsoft/TypeScript/issues/60908
// mais rajouter un statement juste après les imports enlève ces warning
// Enlever cette ligne après le merge de https://github.com/microsoft/TypeScript/pull/60921
// @ts-ignore
const inutile = true;

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
        const évènementsPhase = dossierParams.évènementsPhase
        delete dossierParams.évènementsPhase

        for(const ev of évènementsPhase){
            ev.cause_personne = causePersonne
        }

        phaseAjoutée = ajouterÉvènementsPhaseDossier(évènementsPhase)

        throw `PPP 
            - recupérer la dernière transition de phase et identifier quoi faire selon la config
            - commencer par "recevabilité DDEP" => "Instruction". Dans ce cas-là, provoquer le changement aussi chez DS
        `

        const dernierÉvènementPhaseDossier = évènementsPhase.to
    }

    let dossierÀJour = Promise.resolve()

    if(Object.keys(dossierParams).length >= 1){
        dossierÀJour = updateDossierDatabase(id, dossierParams)
    }

    return Promise.all([phaseAjoutée, dossierÀJour])
}