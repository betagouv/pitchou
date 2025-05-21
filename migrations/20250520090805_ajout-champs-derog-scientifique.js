/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.text('description')
            .comment(`Description du dossier fournie par le pétitionnaire`)
        table.json('scientifique_type_demande')
        table.text('scientifique_description_protocole_suivi')
        table.json('scientifique_mode_capture')
        table.text('scientifique_modalités_source_lumineuses')
            .comment(`null signifie qu'il n'y a pas d'utilisation de sources lumineuses`)
        table.text('scientifique_modalités_marquage')
        table.text('scientifique_modalités_transport')

    });

};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.dropColumns(
            'description',
            'scientifique_type_demande',
            'scientifique_description_protocole_suivi',
            'scientifique_mode_capture',
            'scientifique_modalités_source_lumineuses',
            'scientifique_modalités_marquage',
            'scientifique_modalités_transport'
        )
    });

};
