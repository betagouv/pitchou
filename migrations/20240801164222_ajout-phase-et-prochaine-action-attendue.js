/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.string('phase')
        table.string('prochaine_action_attendue_par')
        table.string('prochaine_action_attendue')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.dropColumn('phase')
        table.dropColumn('prochaine_action_attendue_par')
        table.dropColumn('prochaine_action_attendue')
    });
};
