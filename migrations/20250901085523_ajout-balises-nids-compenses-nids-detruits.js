/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.integer('nombre_nids_détruits')
            .comment(`Réponse à la question "Nombre de nids d'Hirondelles détruits"`)
        table.integer('nombre_nids_compensés')
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
            'nombre_nids_détruits',
            'nombre_nids_compensés'
        )
    });

};