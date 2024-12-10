/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('évènement_phase_dossier', function (table) {
        table.integer('cause_personne').defaultTo(null)
        // Pour le moment, "cause_personne == NULL" va signifier que c'est l'outil de sync DS
        // qui a produit l'évènement de phase

        table.foreign('cause_personne')
            .references('id').inTable('personne').onDelete('CASCADE')

        table.unique(['dossier', 'phase', 'horodatage'])
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('évènement_phase_dossier', function (table) {
        table.dropColumn('cause_personne')
    });
};
