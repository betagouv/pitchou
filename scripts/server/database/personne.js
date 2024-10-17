//@ts-check

import {directDatabaseConnection} from '../database.js'

//@ts-ignore
/** @import {default as Personne, PersonneInitializer} from '../../types/database/public/Personne.ts' */

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
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByEmail(email) {
    return directDatabaseConnection('personne')
    .where({ email })
    .select()
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