import knex from 'knex';

import {directDatabaseConnection} from '../database.js'

/** @import {default as Dossier} from '../../types/database/public/Dossier.js' */

/**
 * 
 * @param {Dossier['id_demarches_simplifiées'][]} DS_ids 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Pick<Dossier, 'id' | 'id_demarches_simplifiées' | 'number_demarches_simplifiées'>[]>}
 */
export function getDossierIdsFromDS_Ids(DS_ids, databaseConnection = directDatabaseConnection){
    return databaseConnection('dossier')
        .select(['id', 'id_demarches_simplifiées', 'number_demarches_simplifiées'])
        .whereIn('id_demarches_simplifiées', DS_ids)
}


/**
 * 
 * @param {Map<Dossier['id'], DS_Messages>} idToMessages 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
export function dumpDossierMessages(idToMessages, databaseConnection = directDatabaseConnection){
    throw `PPP`
}