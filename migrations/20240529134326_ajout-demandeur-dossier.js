/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.createTable('entreprise', (table) => {
        table.string('siret', 14).primary();
        table.string('raison_sociale');
        table.string('adresse');
    });
    
    return knex.schema.alterTable('dossier', (table) => {
        table.integer('demandeur_personne_physique').unsigned().index()
        table.foreign('demandeur_personne_physique').references('id').inTable('personne')
        table.string('demandeur_personne_morale', 14).index()
        table.foreign('demandeur_personne_morale').references('siret').inTable('entreprise')

        table.dropColumn('identité_petitionnaire')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('entreprise');

    return knex.schema.alterTable('dossier', (table) => {
        table.dropColumn('demandeur_personne_physique');
        table.dropColumn('demandeur_personne_morale');

        // Ça recréé la colonne, mais les données sont perdues
        // et ce n'est pas grave, cette colonne était pensée comme temporaire depuis le début
        table.string('identité_petitionnaire'); 
    });
};
