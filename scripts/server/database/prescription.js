import {directDatabaseConnection} from '../database.js'

/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */
/** @import {default as DécisionAdministrative} from '../../types/database/public/DécisionAdministrative.ts' */
/** @import {DossierDS88444} from '../../types/démarches-simplifiées/apiSchema.ts' */
/** @import {AnnotationsPriveesDemarcheSimplifiee88444} from '../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {TypeDécisionAdministrative} from '../../types/API_Pitchou.ts' */
/** @import {DécisionAdministrativeAnnotation88444} from '../../types/démarches-simplifiées/DossierPourSynchronisation.ts' */

/** @import {Knex} from 'knex' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;


/**
 * 
 * @param {Partial<Prescription>} prescription 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Prescription['id']>}
 */
export function ajouterPrescription(prescription, databaseConnection = directDatabaseConnection){
    return databaseConnection('prescription')
        .insert(prescription)
        .returning(['id'])
        .then(prescriptions => prescriptions[0].id)
}

/**
 * 
 * @param {DécisionAdministrative['id'][]} décisionIds 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Prescription[]>}
 */
export function getPrescriptions(décisionIds, databaseConnection = directDatabaseConnection){
    return databaseConnection('prescription')
        .select('*')
        .whereIn('décision_administrative', décisionIds)
}