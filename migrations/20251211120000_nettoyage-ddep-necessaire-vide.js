/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex('dossier')
        .where('ddep_nécessaire', '')
        .update({'ddep_nécessaire': null})
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex('dossier')
        .whereNull('ddep_nécessaire')
        .update({'ddep_nécessaire': ''})
}

