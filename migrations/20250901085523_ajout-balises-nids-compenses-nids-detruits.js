/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.integer('nb_nids_detruits')
            .comment(`Réponse à la question "Nombre de nids d'Hirondelles détruits"`)
        table.integer('nb_nids_compenses')
            .comment(`Réponse à la question "Indiquer le nombre de nids artificiels posés en compensation"`)
    });

};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.dropColumns(
            'nb_nids_detruits',
            'nb_nids_compenses'
        )
    });

};