/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('résultat_synchronisation_DS_88444', function (table) {
        table.boolean('succès').notNullable()
        table.datetime('horodatage', { precision: 0 }).notNullable() // précision à la seconde
        table.text('erreur')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('résultat_synchronisation_DS_88444')
};

