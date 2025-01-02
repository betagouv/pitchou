import knexModule from 'knex'

const ancienNom = "Vérification du dossier"
const nouveauNom = "Étude recevabilité DDEP"

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    const databaseConnection = knexModule({
        client: 'pg',
        connection: process.env.DATABASE_URL,
    });

    await databaseConnection('évènement_phase_dossier')
        .update('phase', nouveauNom)
        .where({'phase': ancienNom})

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    
    const databaseConnection = knexModule({
        client: 'pg',
        connection: process.env.DATABASE_URL,
    });

    await databaseConnection('évènement_phase_dossier')
        .update('phase', ancienNom)
        .where({'phase': nouveauNom})
};

