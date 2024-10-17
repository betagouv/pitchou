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
 * @returns {Promise<Partial<{écritureAnnotationCap: CapÉcritureAnnotation['cap'], listerDossiers: string, listerRelationSuivi: string, listerMessages: string, modifierDossier: string, identité: IdentitéInstructeurPitchou}>>}
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

    // hardcodé temporairement
    const listerDossiersP = Promise.resolve(code_accès)
    // hardcodé temporairement
    const listerRelationSuiviP = Promise.resolve(code_accès)
    // hardcodé temporairement
    const listerMessagesP = Promise.resolve(code_accès)
    // hardcodé temporairement
    const modifierDossierP = Promise.resolve(code_accès)

    return Promise.all([écritureAnnotationCapP, listerDossiersP, listerRelationSuiviP, listerMessagesP, modifierDossierP, identitéP])
        .then(([écritureAnnotationCap, listerDossiers, listerRelationSuivi, listerMessages, modifierDossier, identité]) => {
            const ret = {
                écritureAnnotationCap: undefined, 
                listerDossiers, 
                listerRelationSuivi,
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
 * @param {NonNullable<Personne['code_accès']>} _cap 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<ReturnType<PitchouInstructeurCapabilities['listerRelationSuivi']>>}
 */
export async function getRelationSuivis(_cap, databaseConnection = directDatabaseConnection){
    // Pour le moment, on ignore la cap
    // Dans un futur proche, elle servira à trouver la liste des groupes d'instructeurs auquel l'instructeur actuel appartient
    // (et donc la liste des dossiers pertinents qui sont ceux associés à ces groupes d'instructeurs)

    // Pour le moment, on va dire qu'on retourne l'ensemble de toutes les relations de suivi et c'est ok
    const relsBDD = await databaseConnection('arête_personne_suit_dossier')
        .select(['email', 'dossier'])
        .leftJoin('personne', {
            'personne.id': 'arête_personne_suit_dossier.personne'
        })

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
