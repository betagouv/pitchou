/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.renameTable('espèces_impactées', 'fichier');

    await knex.schema.alterTable('dossier', function (table) {
        table.uuid('espèces_impactées')
        table.foreign('espèces_impactées')
            .references('id').inTable('fichier').onDelete('SET NULL')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.dropColumn('espèces_impactées')
    });

    await knex.schema.renameTable('fichier', 'espèces_impactées');
};
