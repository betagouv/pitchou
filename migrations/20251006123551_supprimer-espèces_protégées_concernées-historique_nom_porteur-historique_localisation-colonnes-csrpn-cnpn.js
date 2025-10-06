/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('dossier', table => {
        table.dropColumn('espèces_protégées_concernées')
        table.dropColumn('historique_nom_porteur')
        table.dropColumn('historique_localisation')
        table.dropColumn('historique_date_saisine_csrpn')
        table.dropColumn('historique_date_saisine_cnpn')
        table.dropColumn('date_avis_csrpn')
        table.dropColumn('date_avis_cnpn')
        table.dropColumn('avis_csrpn_cnpn')
    })

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('dossier', table => {
        table.string('espèces_protégées_concernées')
        table.string('historique_nom_porteur')
        table.string('historique_localisation')
        table.date('historique_date_saisine_csrpn')
        table.date('historique_date_saisine_cnpn')
        table.date('date_avis_csrpn')
        table.date('date_avis_cnpn')
        table.string('avis_csrpn_cnpn')
    })
};