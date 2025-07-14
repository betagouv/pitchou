/** @import {DossierDS88444, DSFile} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {default as Fichier} from '../../scripts/types/database/public/Fichier.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {Knex} from 'knex' */

import trouverCandidatsFichiersÀTélécharger from './trouverCandidatsFichiersÀTélécharger.js'
import téléchargerNouveauxFichiers from './téléchargerNouveauxFichiers.js'

/**
 * 
 * @param {DossierDS88444[]} dossiers 
 * @param {ChampDescriptor['id']} champDescriptorId
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id'][]> | undefined>} 
 */
export default async function téléchargerNouveauxFichiersAP_AM(dossiers, champDescriptorId, laTransactionDeSynchronisationDS){

    /** @type {Map<DossierDS88444['number'], DSFile[]>} */
    const candidatsFichiersAP_AM = trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId)

    //console.log('candidatsFichiersAP_AM', candidatsFichiersAP_AM)

    //checkMemory()

    if(candidatsFichiersAP_AM.size >= 1){
        return téléchargerNouveauxFichiers(
            candidatsFichiersAP_AM, 
            laTransactionDeSynchronisationDS
        )
    }
}

