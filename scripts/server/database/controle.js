import {directDatabaseConnection} from '../database.js'

//@ts-ignore
/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */
//@ts-ignore
/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */

/** @import {Knex} from 'knex' */


/**
 * 
 * @param {Prescription['id'][]} prescriptionId 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Contrôle[]>}
 */
export function getContrôles(prescriptionId, databaseConnection = directDatabaseConnection){
    return databaseConnection('contrôle')
        .select('*')
        .whereIn('prescription', prescriptionId)
        .orderBy('date_contrôle', 'asc')
}

/**
 * 
 * @param {Partial<Contrôle>} contrôle 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<{prescriptionId: Prescription['id']}>}
 */
export function ajouterContrôle(contrôle, databaseConnection = directDatabaseConnection){
    return databaseConnection('contrôle')
        .insert(contrôle)
        .returning(['id'])
        .then(prescriptions => ({prescriptionId: prescriptions[0].id}))
}


/**
 * 
 * @param {Partial<Contrôle>} contrôle 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function modifierContrôle(contrôle, databaseConnection = directDatabaseConnection){
    return databaseConnection('contrôle')
        .update(contrôle)
        .where({id: contrôle.id})
}


/**
 * 
 * @param {Contrôle['id']} id 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function supprimerContrôle(id, databaseConnection = directDatabaseConnection){
    return databaseConnection('contrôle')
        .delete()
        .where({id})
}