/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', table => {
        table.dropColumn('en_attente_de')
        table.dropColumn('commentaire_libre')
    })

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('dossier', table => {
        table.string('en_attente_de')
        table.text('commentaire_libre')
    })
};

