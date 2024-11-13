//@ts-check

import knex from 'knex';

/** @import {default as Personne} from '../types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../types/database/public/Entreprise.ts' */
/** @import {default as CapÉcritureAnnotation} from '../types/database/public/CapÉcritureAnnotation.ts' */
/** @import {IdentitéInstructeurPitchou, PitchouInstructeurCapabilities} from '../types/capabilities.ts' */

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

export const directDatabaseConnection = knex({
    client: 'pg',
    connection: DATABASE_URL,
});

/**
 * 
 * @returns {ReturnType<knex.Knex['destroy']>}
 */
export function closeDatabaseConnection(){
    return directDatabaseConnection.destroy()
}


/**
 *
 * @returns {Promise<Entreprise[]>}
 */
export function listAllEntreprises(){
    return directDatabaseConnection('entreprise').select()
}

/**
 *
 * @param {Entreprise[]} entreprises
 * @returns {Promise<any>}
 */
export function dumpEntreprises(entreprises){
    return directDatabaseConnection('entreprise')
    .insert(entreprises)
    .onConflict('siret')
    .merge()
}



/**
 * 
 * @param {CapÉcritureAnnotation['cap']} cap 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<CapÉcritureAnnotation['instructeur_id']>}
 */
export async function getInstructeurIdByÉcritureAnnotationCap(cap, databaseConnection = directDatabaseConnection){
    const res = await databaseConnection('cap_écriture_annotation')
        .select('instructeur_id')
        .where({cap})
        .first()

    return res && res.instructeur_id
}


/**
 * 
 * @param {NonNullable<Personne['code_accès']>} code_accès 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Partial<{écritureAnnotationCap: CapÉcritureAnnotation['cap'], listerDossiers: string, listerRelationSuivi: string, listerÉvènementsPhaseDossier:string, listerMessages: string, modifierDossier: string, identité: IdentitéInstructeurPitchou}>>}
 */
export async function getInstructeurCapBundleByPersonneCodeAccès(code_accès, databaseConnection = directDatabaseConnection){
    
    const écritureAnnotationCapP = databaseConnection('arête_personne__cap_écriture_annotation')
        .select('cap')
        .leftJoin('cap_écriture_annotation', {
            'cap_écriture_annotation.cap': 
            'arête_personne__cap_écriture_annotation.écriture_annotation_cap'
        })
        .where({personne_cap: code_accès})
        .first();

    const identitéP = databaseConnection('personne')
        .select('email')
        .where({code_accès})
        .first();

    const listerDossiersP = databaseConnection('cap_dossier')
        .select('cap')
        .where({personne_cap: code_accès})
        .first()
        .then(({cap}) => cap)

    const listerRelationSuiviP = listerDossiersP

    // hardcodé temporairement
    const listerMessagesP = Promise.resolve(code_accès)
    // hardcodé temporairement
    const listerÉvènementsPhaseDossierP = listerDossiersP
    // hardcodé temporairement
    const modifierDossierP = Promise.resolve(code_accès)

    return Promise.all([écritureAnnotationCapP, listerDossiersP, listerRelationSuiviP, listerÉvènementsPhaseDossierP, listerMessagesP, modifierDossierP, identitéP])
        .then(([écritureAnnotationCap, listerDossiers, listerRelationSuivi, listerÉvènementsPhaseDossier, listerMessages, modifierDossier, identité]) => {
            const ret = {
                écritureAnnotationCap: undefined, 
                listerDossiers, 
                listerRelationSuivi,
                listerÉvènementsPhaseDossier,
                listerMessages, 
                modifierDossier, 
                identité
            }

            if(écritureAnnotationCap && écritureAnnotationCap.cap)
                ret.écritureAnnotationCap = écritureAnnotationCap.cap

            return ret
        })

}

/**
 * 
 * @param {NonNullable<Personne['code_accès']>} listeDossiersCap 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<ReturnType<PitchouInstructeurCapabilities['listerRelationSuivi']>>}
 */
export async function getRelationSuivis(listeDossiersCap, databaseConnection = directDatabaseConnection){
    const relsBDD = await databaseConnection('dossier')
        .select(['dossier.id as dossier', 'personne.email as email'])
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'dossier.id'})
        .join(
            'arête_cap_dossier__groupe_instructeurs', 
            {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'}
        )
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": listeDossiersCap})
        .leftJoin(
            'arête_personne_suit_dossier', 
            {'arête_personne_suit_dossier.dossier': 'dossier.id'}
        )
        .leftJoin('personne', {
            'personne.id': 'arête_personne_suit_dossier.personne'
        })
        .whereNotNull('email')
   
    //console.log('relsBDD', relsBDD)

    const retMap = new Map();

    for(const {email, dossier} of relsBDD){
        const dossiersSuivisIds = retMap.get(email) || new Set()
        dossiersSuivisIds.add(dossier)
        retMap.set(email, dossiersSuivisIds)
    }

    return [...retMap].map(([email, dossiersSuivisIds]) => 
        ({personneEmail: email, dossiersSuivisIds: [...dossiersSuivisIds]})
    )
}
