/** @import {DossierDS88444, DSPieceJustificative} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
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
 * @returns {Promise<Map<DossierDS88444['number'], Partial<Fichier>[]>> | Promise<void>} 
 */
export default function téléchargerNouveauxFichiersAP_AM(dossiers, champDescriptorId, laTransactionDeSynchronisationDS){

    /** @type {Map<DossierDS88444['number'], DSPieceJustificative[]>} */
    const candidatsFichiersAP_AM = trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId)

    //console.log('candidatsFichiersAP_AM', candidatsFichiersAP_AM)

    //checkMemory()

    /** @type { ReturnType<téléchargerNouveauxFichiersAP_AM> } */
    let fichiersAP_AMTéléchargésP = Promise.resolve() 
    if(candidatsFichiersAP_AM.size >= 1){
        // ne garder que le premier fichier et ignorer les autres
        let candidatsFichiersAP_AMUnParChamp = new Map(
            [...candidatsFichiersAP_AM].map(([number, descriptionFichier]) => [number, [descriptionFichier[0]]])
        )

        fichiersAP_AMTéléchargésP = téléchargerNouveauxFichiers(
            candidatsFichiersAP_AMUnParChamp, 
            laTransactionDeSynchronisationDS
        )
    }

    return fichiersAP_AMTéléchargésP
}

