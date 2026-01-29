/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', async function (table) {
        await knex.raw(`
            UPDATE dossier
            SET commentaire_libre = ''
            WHERE commentaire_libre IS NULL;
        `)

        await table.text('commentaire_libre')
            .notNullable()
            .defaultTo('')
            .alter()
    });

};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.text('commentaire_libre')
            .nullable()
            .alter()
    });

};
