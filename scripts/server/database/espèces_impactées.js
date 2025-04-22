import {directDatabaseConnection} from '../database.js'

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {Knex} from 'knex' */

/**
 * 
 * @param {Partial<Fichier>[]} descriptionsEspècesImpactées
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>[]>}
 */
export function trouverFichiersEspècesImpactéesExistants(descriptionsEspècesImpactées, databaseConnection = directDatabaseConnection){

    return databaseConnection('fichier')
        .select(['DS_checksum', 'DS_createdAt', 'nom', 'media_type'])
        .whereIn(
            ['DS_checksum', 'DS_createdAt', 'nom', 'media_type'],
            // @ts-ignore
            descriptionsEspècesImpactées
                .map(({DS_checksum, DS_createdAt, nom, media_type}) => 
                    [DS_checksum, DS_createdAt, nom, media_type]
                )
        )

}


/**
 * 
 * @param {Partial<Fichier>[]} espècesImpactées
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function ajouterFichiersEspèces(espècesImpactées, databaseConnection = directDatabaseConnection){
    return databaseConnection('fichier')
        .insert(espècesImpactées)
        .onConflict('dossier')
        .merge()        

}
