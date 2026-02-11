/**
 * Met par défaut une chaîne vide pour historique_identifiant_demande_onagre,
 * comme pour commentaire_libre.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    // Normaliser les données existantes : remplacer les NULL par une chaîne vide
    await knex.raw(`
        UPDATE dossier
        SET historique_identifiant_demande_onagre = ''
        WHERE historique_identifiant_demande_onagre IS NULL;
    `);

    // Rendre la colonne non nulle avec une valeur par défaut ''
    await knex.schema.alterTable('dossier', function (table) {
        table.string('historique_identifiant_demande_onagre')
            .notNullable()
            .defaultTo('')
            .alter();
    });
}

/**
 * Revenir à une colonne nullable (comme avant cette migration).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('dossier', function (table) {
        table.string('historique_identifiant_demande_onagre')
            .nullable()
            .alter();
    });
}

