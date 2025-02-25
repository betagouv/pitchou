/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('évènement_phase_dossier', function (table) {
        table.string('DS_emailAgentTraitant')
        table.text('DS_motivation')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('évènement_phase_dossier', function (table) {
        table.dropColumn('DS_emailAgentTraitant')
        table.dropColumn('DS_motivation')
    });

};
