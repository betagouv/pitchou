/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('espèces_impactées', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid())
        table.integer('dossier').notNullable().unique()
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE')

        table.string('nom')
        table.string('media_type') // https://developer.mozilla.org/en-US/docs/Glossary/MIME_type
        table.binary('contenu')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('espèces_impactées')
};

