/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    // Vider les données existantes parce qu'elles contenaient les phases DS
    // alors que "phase" devrait contenir les phases Pitchou
    await knex('évènement_phase_dossier').delete()

    await knex.schema.alterTable('évènement_phase_dossier', function (table) {
        table.integer('cause_personne').defaultTo(null)
        // Pour le moment, "cause_personne == NULL" va signifier que c'est l'outil de sync DS
        // qui a produit l'évènement de phase

        table.foreign('cause_personne')
            .references('id').inTable('personne').onDelete('CASCADE')

    });

    await knex.schema.alterTable('dossier', function (table) {
        table.dropColumn('phase')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.schema.alterTable('dossier', function (table) {
        table.string('phase') // des données sont perdues, 
        // mais rien d'important n'est stocké actuellement dans cette colonne
    });

    await knex.schema.alterTable('évènement_phase_dossier', function (table) {
        table.dropColumn('cause_personne')
    });

};
