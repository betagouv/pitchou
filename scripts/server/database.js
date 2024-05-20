//@ts-check

import knex from 'knex';

/** @typedef {import('../types/database/public/Personne.js').default} Personne */
/** @typedef {import('../types/database/public/Dossier.js').default} Dossier */

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const database = knex({
    client: 'pg',
    connection: DATABASE_URL,
});


/**
 * @param {import('../types/database/public/Personne.js').PersonneInitializer} personne
 */
export function créerPersonne(personne){
    return database('personne')
    .insert(personne)
}

/**
 * 
 * @param {Personne['code_accès']} code_accès 
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByCode(code_accès) {
    return database('personne')
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
    return database('personne')
    .where({ email })
    .select()
    .first()
}

/**
 * 
 * @returns {Promise<Dossier[]>}
 */
export function getAllDossier() {
    return database('dossier')
    .select()
}

/**
 * 
 * @param {Personne['email']} email 
 * @param {Personne['code_accès']} code_accès 
 * @returns 
 */
function updateCodeAccès(email, code_accès){
    return database('personne')
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
    .catch(err => {
        // suppose qu'il y a une erreur parce qu'une personne avec cette adresse email existe déjà
        return updateCodeAccès(email, codeAccès)
    })
    .then(() => codeAccès)
}