/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.boolean('scientifique_bilan_antérieur')
            .comment(`Réponse à la question "Cette demande concerne un programme de suivi déjà existant"`)
        table.json('scientifique_finalité_demande')
            .comment(`Réponse à la question "Captures/Relâchers/Prélèvement - Finalité(s) de la demande"`)
    });

};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.dropColumns(
            'scientifique_bilan_antérieur',
            'scientifique_finalité_demande'
        )
    });

};
