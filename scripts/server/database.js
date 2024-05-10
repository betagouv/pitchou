//@ts-check

import knex from 'knex';

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
 * @param {string} code_accès 
 * @returns {Promise<import('../types/database/public/Personne.js').default> | Promise<undefined>}
 */
export function getPersonneByCode(code_accès) {
    return database('personne')
    .where({ code_accès })
    .select('id')
    .first()
}

export function getAllDossier() {
    return database('dossier')
    .select()
}