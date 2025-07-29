/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('arête_personne_suit_dossier', (table) => {
        table.unique(['dossier', 'personne'])
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('arête_personne_suit_dossier', (table) => {
        table.dropUnique(['dossier', 'personne'])
    });
};
