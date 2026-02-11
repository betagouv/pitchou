
/** @import {DossierDS88444} from '../../scripts/types/démarche-numérique/apiSchema.ts' */
/** @import {Knex} from 'knex' */

/**
 * 
 * @param {DossierDS88444[]} dossiersDN
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 */
export async function mettreÀjourNotification(dossiersDN, laTransactionDeSynchronisationDS) {
    console.log('dateDerniereModification', dossiersDN[0].dateDerniereModification)
}