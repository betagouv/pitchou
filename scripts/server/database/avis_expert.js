/** @import {default as AvisExpert} from '../../types/database/public/AvisExpert.ts' */
/** @import { Knex } from 'knex' */

import { directDatabaseConnection } from '../database.js'

/**
 * @param { AvisExpert | AvisExpert[] } avisExpert
 * @param { Knex.Transaction | Knex } [databaseConnection]
 * @returns { Promise<AvisExpert>}
 */
export function ajouterAvisExpert(avisExpert, databaseConnection = directDatabaseConnection) {
    return databaseConnection('avis_expert').insert(avisExpert).returning(['id'])
}