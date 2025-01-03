import {directDatabaseConnection} from '../database.js'

/** @import {default as EspècesImpactées} from '../../../scripts/types/database/public/EspècesImpactées.ts' */
/** @import {Knex} from 'knex' */

/**
 * 
 * @param {Partial<EspècesImpactées>[]} descriptionsEspècesImpactées
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<EspècesImpactées>[]>}
 */
export function trouverFichiersEspècesImpactéesExistants(descriptionsEspècesImpactées, databaseConnection = directDatabaseConnection){

    return databaseConnection('espèces_impactées')
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
 * @param {Partial<EspècesImpactées>[]} espècesImpactées
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function ajouterFichiersEspèces(espècesImpactées, databaseConnection = directDatabaseConnection){
    return databaseConnection('espèces_impactées')
        .insert(espècesImpactées)
        .onConflict('dossier')
        .merge()        

}
