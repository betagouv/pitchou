/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.table('évènement_métrique', (table) => {
        table.index('évènement')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.table('évènement_métrique', (table) => {
        table.dropIndex('évènement')
    });
};
