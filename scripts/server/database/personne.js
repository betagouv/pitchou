//@ts-check

/** @import {Knex} from 'knex' */
/** @import {default as Personne, PersonneInitializer} from '../../types/database/public/Personne.ts' */
/** @import {default as CapDossier} from '../../types/database/public/CapDossier.ts' */

import knex from 'knex';
import { directDatabaseConnection } from '../database.js';
import { normalisationEmail } from '../../commun/manipulationStrings.js';


//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @param {PersonneInitializer} personne
 */
export function créerPersonne(personne, databaseConnection = directDatabaseConnection){
    if (personne.email) {
        personne.email = normalisationEmail(personne.email)
    }

    return databaseConnection('personne')
    .insert(personne)
}

/**
 * @param {PersonneInitializer[]} personnes
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns { Promise<{id: Personne['id']}[]> }
 */
export function créerPersonnes(personnes, databaseConnection = directDatabaseConnection){
    for (const personne of personnes) {
        if (personne.email) {
            personne.email = normalisationEmail(personne.email)
        }
    }

    return databaseConnection('personne')
    .insert(personnes, ['id'])
}


/**
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @param {Personne['code_accès']} code_accès
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByCode(code_accès, databaseConnection = directDatabaseConnection) {
    return databaseConnection('personne')
    .where({ code_accès })
    .select('id')
    .first()
}

/**
 *
 * @param {Personne['email']} email
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByEmail(email, databaseConnection = directDatabaseConnection) {
    return databaseConnection('personne')
    .select('*')
    .where({ email })
    .first()
}

/**
 *
 * @param {Personne['email'][]} emails
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Personne[]>}
 */
export function getPersonnesByEmail(emails ,databaseConnection = directDatabaseConnection) {
    return databaseConnection('personne')
        .select()
        .whereIn('email', emails)

}

/**
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @param {CapDossier['cap']} cap
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByDossierCap(cap, databaseConnection = directDatabaseConnection){

    return databaseConnection('personne')
        .select(['personne.id', 'personne.email'])
        .leftJoin('cap_dossier', {'cap_dossier.personne_cap': 'personne.code_accès'})
        .where('cap_dossier.cap', cap)
        .first()
}

/**
 *
 * @param {Personne['email']} email
 * @param {Personne['code_accès']} code_accès
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns
 */
function updateCodeAccès(email, code_accès, databaseConnection = directDatabaseConnection){
    return databaseConnection('personne')
    .where({ email })
    .update({code_accès})
}

/**
 *
 * @param {Personne['email']} email
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Personne['code_accès']>}
 */
export function créerPersonneOuMettreÀJourCodeAccès(email, databaseConnection = directDatabaseConnection){
    const codeAccès = Math.random().toString(36).slice(2)

    return créerPersonne({
        nom: '',
        prénoms: '',
        email,
        code_accès: codeAccès
    }, databaseConnection)
    .catch(_err => {
        // suppose qu'il y a une erreur parce qu'une personne avec cette adresse email existe déjà
        return updateCodeAccès(email, codeAccès, databaseConnection)
    })
    .then(() => codeAccès)
}

/**
 *
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Personne[]>}
 */
export function listAllPersonnes(databaseConnection = directDatabaseConnection){
    return databaseConnection('personne').select()
}
