/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', table => {
        table.dropColumn('historique_date_réception_ddep')
    })

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('dossier', table => {
        table.date('historique_date_réception_ddep')
    })
};

