/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('fichier', function (table) {
        table.dropColumn('dossier')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('fichier', function (table) {
        table.integer('dossier')
    });
};
