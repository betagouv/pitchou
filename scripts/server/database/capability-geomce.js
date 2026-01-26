/** @import {default as CapabilityGeomce} from '../../types/database/public/CapabilityGeomce.ts' */
/** @import {Knex} from 'knex' */

import {directDatabaseConnection} from '../database.js'


/**
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<void>}
 */
export async function miseEnPlaceSecretGeoMCE(databaseConnection = directDatabaseConnection){
    const secretsGeoMCE = await databaseConnection('capability-geomce')
        .select('*')

    if(secretsGeoMCE.length === 0){
        console.log(`Aucune capability GeoMCE détectée. Création d'une capability GeoMCE`)
        await databaseConnection('capability-geomce').insert({})
    }

    if(secretsGeoMCE.length >= 2){
        console.warn(`${secretsGeoMCE} secrets GeoMCE détectés. C'est bizarre, parce qu'on n'en attendait qu'un seul`)
    }

}

/**
 * 
 * @param {CapabilityGeomce['secret']} secret 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<void>}
 */
export async function verifierSecretGeoMCE(secret, databaseConnection = directDatabaseConnection){
    const secretsGeoMCE = await databaseConnection('capability-geomce')
        .select('*')
        .where({secret: secret})

    if(secretsGeoMCE.length === 0){
        throw new Error(`Capability ${secret} non reconnue`)
    }
}


/**
 * Fonction sensible. À appeler avec prudence
 * 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<void>}
 */
export async function récupérerSecretGeoMCE(databaseConnection = directDatabaseConnection){
    const {secret} = await databaseConnection('capability-geomce')
        .select('*')
        .first()

    return secret
}

/**
 * Fonction sensible. À appeler avec prudence
 * 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<CapabilityGeomce['secret']>}
 */
export async function resetSecretGeoMCE(databaseConnection = directDatabaseConnection){
    // supprimer le secret existant
    await databaseConnection('capability-geomce')
        .delete()
    
    // créer un nouveau secret
    const [{secret}] = await databaseConnection('capability-geomce')
        .insert({}) 
        .returning(['secret'])

    return secret
}
 