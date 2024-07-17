/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        // nom du projet
        table.string('nom', (2**10)-1)
        table.bigint('number_demarches_simplifiées')

        // annotations privées
        table.string('historique_nom_porteur')
        table.string('historique_localisation')

        table.string('ddep_nécessaire')
        table.string('en_attente_de')

        table.boolean('enjeu_politique')

        table.text('commentaire')

        table.date('historique_date_réception_ddep')
        table.date('historique_date_envoi_dernière_contribution')
        table.string('historique_identifiant_demande_onagre')

        table.date('historique_date_saisine_csrpn')
        table.date('historique_date_saisine_cnpn')

        // enfermé dans des pdfs
        table.date('date_avis_csrpn')
        table.date('date_avis_cnpn')
        table.string('avis_csrpn_cnpn')

        table.date('date_consultation_public')

        table.string('historique_décision')
        table.date('historique_date_signature_arrêté_préfectoral')
        table.string('historique_référence_arrêté_préfectoral')
        table.date('historique_date_signature_arrêté_ministériel')
        table.string('historique_référence_arrêté_ministériel')
    }).then(() => {
        return knex.schema.table('dossier', function (table) {
            // Ajouter une nouvelle colonne boolean
            table.boolean('enjeu_écologique');
        }).then(() => {
            // Mettre à jour les valeurs de la nouvelle colonne en fonction de l'ancienne colonne
            return knex('dossier').update({
                enjeu_écologique: knex.raw(`CASE WHEN enjeu_écologiques IS NULL OR enjeu_écologiques = 'false' THEN false ELSE true END`)
            });
        }).then(function () {
            // Supprimer l'ancienne colonne
            return knex.schema.table('dossier', function (table) {
                table.dropColumn('enjeu_écologiques');
            });
        })
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.dropColumn('nom')
        table.dropColumn('number_demarches_simplifiées')

        table.dropColumn('historique_nom_porteur')
        table.dropColumn('historique_localisation')

        table.dropColumn('ddep_nécessaire')
        table.dropColumn('en_attente_de')

        table.dropColumn('enjeu_politique')

        table.dropColumn('commentaire')

        table.dropColumn('historique_date_réception_ddep')
        table.dropColumn('historique_date_envoi_dernière_contribution')
        table.dropColumn('historique_identifiant_demande_onagre')

        table.dropColumn('historique_date_saisine_csrpn')
        table.dropColumn('historique_date_saisine_cnpn')

        table.dropColumn('date_avis_csrpn')
        table.dropColumn('date_avis_cnpn')
        table.dropColumn('avis_csrpn_cnpn')

        table.dropColumn('date_consultation_public')

        table.dropColumn('historique_décision')
        table.dropColumn('historique_date_signature_arrêté_préfectoral')
        table.dropColumn('historique_référence_arrêté_préfectoral')
        table.dropColumn('historique_date_signature_arrêté_ministériel')
        table.dropColumn('historique_référence_arrêté_ministériel')
    })
    .then(() => {
        return knex.schema.table('dossier', function (table) {
            // Ajouter l'ancienne colonne de type string
            table.string('enjeu_écologiques');
        }).then(function () {
            // Restaurer les valeurs de l'ancienne colonne à partir de la nouvelle colonne
            return knex('dossier').update({
                enjeu_écologiques: knex.raw(`CASE WHEN enjeu_écologique THEN 'faible' ELSE NULL END`)
            });
        }).then(function () {
            // Supprimer la nouvelle colonne
            return knex.schema.table('dossier', function (table) {
                table.dropColumn('enjeu_écologique');
            });
        });
    })
};
