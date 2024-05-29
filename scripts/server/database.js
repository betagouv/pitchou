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
 * @param {import('../types/database/public/Personne.js').PersonneInitializer[]} personnes
 * @returns { Promise<{id: Personne['id']}[]> }
 */
export function créerPersonnes(personnes){
    return database('personne')
    .insert(personnes, ['id'])
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

/**
 * 
 * @returns {Promise<Personne[]>}
 */
export function listAllPersonnes(){
    return database('personne')
    .select()
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
 * @typedef {Dossier} DossierComplet
 * @property {string} déposant_nom
 * @property {string} déposant_prénoms
 * 
 */


/**
 * 
 * @returns {Promise<DossierComplet[]>}
 */
export function getAllDossiersComplets() {
    return database('dossier')
        .select([ 
            "dossier.id as id",
            "id_demarches_simplifiées", 
            "statut", 
            "date_dépôt", 
            "identité_petitionnaire", 
            "espèces_protégées_concernées", 
            "enjeu_écologiques", 
            "départements", 
            "communes", 
            // déposant
            "déposant.nom as déposant_nom",
            "déposant.prénoms as déposant_prénoms"
        ])
        .join('personne as déposant', {'déposant.id': 'dossier.déposant'})
}

/**
 * 
 * @param {Dossier[]} dossiers 
 * @returns {Promise<any>}
 */
export function dumpDossiers(dossiers){
    return database('dossier')
    .insert(dossiers)
    .onConflict('id_demarches_simplifiées')
    .merge()
}