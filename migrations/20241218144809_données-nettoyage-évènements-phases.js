import knexModule from 'knex'

import {phases} from '../scripts/front-end/affichageDossier.js'

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
        .whereNotIn('phase', [...phases])
        .delete()

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    // rien
};

