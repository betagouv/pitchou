/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.renameColumn('commentaire_enjeu', 'commentaire_libre')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.renameColumn('commentaire_libre', 'commentaire_enjeu')
    });
};
