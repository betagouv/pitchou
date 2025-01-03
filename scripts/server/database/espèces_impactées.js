import knex from 'knex';

import {directDatabaseConnection} from '../database.js'

/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {default as EspècesImpactées} from '../../../scripts/types/database/public/EspècesImpactées.ts' */
/** @import {Knex} from 'knex' */

/**
 * 
 * @param {Partial<EspècesImpactées>[]} descriptionsEspècesImpactées
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<EspècesImpactées>[]>}
 */
export function trouverFichiersEspècesImpactéesExistants(descriptionsEspècesImpactées, databaseConnection = directDatabaseConnection){
    // @ts-ignore
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