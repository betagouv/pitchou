/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    // Ajouter un commentaire à la colonne date_dépôt
    await knex.raw(`
        COMMENT ON COLUMN dossier.date_dépôt IS 'Date à laquelle la demande de dérogation Espèce Protégée a été reçue par les instructeur.i.ces.'
    `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    // Supprimer le commentaire de la colonne date_dépôt
    await knex.raw(`
        COMMENT ON COLUMN dossier.date_dépôt IS NULL
    `);
}