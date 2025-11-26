/** @import { default as AvisExpert, AvisExpertInitializer } from '../../types/database/public/AvisExpert.ts' */
/** @import { Knex } from 'knex' */

import { directDatabaseConnection } from '../database.js'

/**
 * @param { AvisExpertInitializer | AvisExpertInitializer[] } avisExpert
 * @param { Knex.Transaction | Knex } [databaseConnection]
 * @returns { Promise<Pick<AvisExpert, "id">[]>}
 */
export function ajouterAvisExpert(avisExpert, databaseConnection = directDatabaseConnection) {
    return databaseConnection('avis_expert').insert(avisExpert).returning(['id'])
}