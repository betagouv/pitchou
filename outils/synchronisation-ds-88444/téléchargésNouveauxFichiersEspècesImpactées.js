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
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} 
 */
export default async function téléchargerNouveauxFichiersEspècesImpactées(dossiers, champDescriptorId, laTransactionDeSynchronisationDS){

    /** @type {Map<DossierDS88444['number'], DSPieceJustificative[]>} */
    const candidatsFichiersEspècesImpactées = trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId)

    // console.log('candidatsFichiersImpactées', candidatsFichiersImpactées)

    //checkMemory()

    if(candidatsFichiersEspècesImpactées.size >= 1){
        // ne garder que le premier fichier et ignorer les autres
        let candidatsFichiersEspècesImpactéesUnParChamp = new Map(
            [...candidatsFichiersEspècesImpactées].map(([number, descriptionFichier]) => [number, [descriptionFichier[0]]])
        )

        return téléchargerNouveauxFichiers(
            candidatsFichiersEspècesImpactéesUnParChamp, 
            laTransactionDeSynchronisationDS
        )
        .then(nouveauxFichiers => {
            return new Map([...nouveauxFichiers].map(
                ([numéro, [id]]) => [numéro, id]
            ))
        })
    }
}

