//@ts-check

import {directDatabaseConnection} from '../database.js'

/** @import {Knex} from 'knex' */
/** @import {default as Personne, PersonneInitializer} from '../../types/database/public/Personne.ts' */
/** @import {default as CapDossier} from '../../types/database/public/CapDossier.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * @param {PersonneInitializer} personne
 */
export function créerPersonne(personne){
    return directDatabaseConnection('personne')
    .insert(personne)
}

/**
 * @param {PersonneInitializer[]} personnes
 * @returns { Promise<{id: Personne['id']}[]> }
 */
export function créerPersonnes(personnes){
    return directDatabaseConnection('personne')
    .insert(personnes, ['id'])
}


/**
 *
 * @param {Personne['code_accès']} code_accès
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByCode(code_accès) {
    return directDatabaseConnection('personne')
    .where({ code_accès })
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
 * @returns {Promise<Personne[]>}
 */
export function getPersonnesByEmail(emails) {
    return directDatabaseConnection('personne')
        .select()
        .whereIn('email', emails)
    
}

/**
 *
 * @param {CapDossier['cap']} cap
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByDossierCap(cap){

    return directDatabaseConnection('personne')
        .select(['personne.id', 'personne.email'])
        .leftJoin('cap_dossier', {'cap_dossier.personne_cap': 'personne.code_accès'})
        .where('cap_dossier.cap', cap)
        .first()
}

/**
 *
 * @param {Personne['email']} email
 * @param {Personne['code_accès']} code_accès
 * @returns
 */
function updateCodeAccès(email, code_accès){
    return directDatabaseConnection('personne')
    .where({ email })
    .update({code_accès})
}

/**
 *
 * @param {Personne['email']} email
 * @returns {Promise<Personne['code_accès']>}
 */
export function créerPersonneOuMettreÀJourCodeAccès(email){
    const codeAccès = Math.random().toString(36).slice(2)

    return créerPersonne({
        nom: '',
        prénoms: '',
        email,
        code_accès: codeAccès
    })
    .catch(_err => {
        // suppose qu'il y a une erreur parce qu'une personne avec cette adresse email existe déjà
        return updateCodeAccès(email, codeAccès)
    })
    .then(() => codeAccès)
}

/**
 *
 * @returns {Promise<Personne[]>}
 */
export function listAllPersonnes(){
    return directDatabaseConnection('personne').select()
}