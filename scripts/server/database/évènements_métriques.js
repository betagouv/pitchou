/** @import {Knex} from 'knex' */
/** @import { ÉvènementMétrique } from '../../types/évènement.js' */
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */

import {directDatabaseConnection} from '../database.js'


/**
 * @param {string} cap
 * @param {ÉvènementMétrique} évènement
 */
export async function ajouterÉvènementDepuisCap(cap, évènement) {
    const personne = await directDatabaseConnection('cap_évènement_métrique')
        .select('id')
        .from('personne')
        .join('cap_évènement_métrique', {'cap_évènement_métrique.personne_cap': 'personne.code_accès'})
        .where({'cap_évènement_métrique.cap': cap})
        .first()

    if (!personne) {
        throw new Error('Pas de personne avec cette capability')
    }

    await directDatabaseConnection('évènement_métrique')
        .insert({
            évènement: évènement.type,
            détails: 'détails' in évènement ? évènement.détails : null,
            personne: personne.id
        })
}


/**
 * 
 * @param {NonNullable<Personne['email']>} email
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<number>}
 */
export async function supprimerÉvènementsParEmail(email, databaseConnection = directDatabaseConnection){
    return directDatabaseConnection('évènement_métrique')
        .join('personne', {'personne.id': 'évènement_métrique.personne'})
        .where({email: email})
        .delete()
}
