/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.integer('nombre_nids_détruits_dossier_oiseau_simple')
            .comment(`Réponse à la question "Nombre de nids d'Hirondelles détruits"`)
        table.integer('nombre_nids_compensés_dossier_oiseau_simple')
            .comment(`Réponse à la question "Indiquer le nombre de nids artificiels posés en compensation". Concerne les dossiers spécifiques à des oiseaux, comme les hirondelles ou les cigognes.`)
    });

};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.dropColumns(
            'nombre_nids_détruits_dossier_oiseau_simple',
            'nombre_nids_compensés_dossier_oiseau_simple'
        )
    });

};