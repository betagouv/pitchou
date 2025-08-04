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
export async function téléchargerNouveauxFichiersFromChampId(dossiers, champDescriptorId, laTransactionDeSynchronisationDS){
    /** @type {Map<DossierDS88444['number'], DSFile[]>} */
    const candidatsFichiers = trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId)

    if(candidatsFichiers.size >= 1){
        return téléchargerNouveauxFichiers(
            candidatsFichiers, 
            laTransactionDeSynchronisationDS
        )
    }
}


/**
 * 
 * @param {DossierDS88444[]} dossiers 
 * @param {ChampDescriptor['id']} champDescriptorId
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} 
 */
export async function téléchargerNouveauxFichiersEspècesImpactées(dossiers, champDescriptorId, laTransactionDeSynchronisationDS){

    /** @type {Map<DossierDS88444['number'], DSFile[]>} */
    const candidatsFichiersEspècesImpactées = trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId)

    // console.log('candidatsFichiersImpactées', candidatsFichiersImpactées)

    if(candidatsFichiersEspècesImpactées.size >= 1){
        // ne garder que le premier fichier et ignorer les autres

        /** @type {Map<DossierDS88444['number'], DSFile[]>} */
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


/**
 * 
 * @param {DossierDS88444[]} dossiers 
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} 
 */
export async function téléchargerNouveauxFichiersMotivation(dossiers, laTransactionDeSynchronisationDS){

    /** @type {Map<DossierDS88444['number'], DSFile>} */
    const candidatsFichiersMotivation = new Map(
        dossiers.filter(d => !!d.motivationAttachment).map(d => [d.number, d.motivationAttachment])
    )

    //console.log('candidatsFichiersMotivation', candidatsFichiersMotivation.size)

    if(candidatsFichiersMotivation.size >= 1){
        // ne garder que le premier fichier et ignorer les autres
        /** @type {Map<DossierDS88444['number'], DSFile[]>} */
        let candidatsFichiersMotivationPourTéléchargement = new Map(
            [...candidatsFichiersMotivation].map(([number, descriptionFichier]) => [number, [descriptionFichier]])
        )

        return téléchargerNouveauxFichiers(
            candidatsFichiersMotivationPourTéléchargement, 
            laTransactionDeSynchronisationDS
        )
        .then(nouveauxFichiers => {
            return new Map([...nouveauxFichiers].map(
                ([numéro, [id]]) => [numéro, id]
            ))
        })
    }
}

/**
 * 
 * @param {DossierDS88444[]} dossiers 
 * @param {ChampDescriptor['id']} champDescriptorId
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id'][]> | undefined>} 
 */
export async function téléchargerNouveauxFichiersAvisExperts(dossiers, champDescriptorId, laTransactionDeSynchronisationDS){

    /** @type {Map<DossierDS88444['number'], DSFile[]>} */
    const candidatsFichiersAP_AM = trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId)

    //console.log('candidatsFichiersAP_AM', candidatsFichiersAP_AM)

    if(candidatsFichiersAP_AM.size >= 1){
        return téléchargerNouveauxFichiers(
            candidatsFichiersAP_AM, 
            laTransactionDeSynchronisationDS
        )
    }
}