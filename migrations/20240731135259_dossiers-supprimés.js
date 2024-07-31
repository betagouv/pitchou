/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.unique('number_demarches_simplifiées')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.dropUnique(['number_demarches_simplifiées'])
    });
};
