/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.text('description')
            .comment(`Description du dossier fournie par le pétitionnaire`)
        table.date('date_début_intervention')
        table.date('date_fin_intervention')
        table.float('durée_intervention')
            .comment(`Peut être différente de (date_fin_intervention - date_début_intervention) dans le cas des dérogations pluri-annuelles avec un petite période d'intervention annuelle`)

        table.json('scientifique_type_demande')
        table.text('scientifique_description_protocole_suivi')
        table.json('scientifique_mode_capture')
        table.text('scientifique_modalités_source_lumineuses')
            .comment(`null signifie qu'il n'y a pas d'utilisation de sources lumineuses`)
        table.text('scientifique_modalités_marquage')
        table.text('scientifique_modalités_transport')

        table.text('scientifique_périmètre_intervention')
        table.json('scientifique_intervenants')
        table.text('scientifique_précisions_autres_intervenants')

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
            'date_début_intervention',
            'date_fin_intervention',
            'durée_intervention',
            'scientifique_type_demande',
            'scientifique_description_protocole_suivi',
            'scientifique_mode_capture',
            'scientifique_modalités_source_lumineuses',
            'scientifique_modalités_marquage',
            'scientifique_modalités_transport',
            'scientifique_périmètre_intervention',
            'scientifique_intervenants',
            'scientifique_précisions_autres_intervenants'

        )
    });

};
