/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.createTable('cap_écriture_annotation', function (table) {
        table.uuid('cap').primary().defaultTo(knex.fn.uuid())
        table.string('instructeur_id').notNullable().unique()
    });

    await knex.schema.createTable('arête_personne__cap_écriture_annotation', function (table) {
        table.string('personne_cap').unique()
        table.foreign('personne_cap')
            .references('code_accès').inTable('personne').onDelete('CASCADE')
        
        table.uuid('écriture_annotation_cap')
        table.foreign('écriture_annotation_cap')
            .references('cap').inTable('cap_écriture_annotation').onDelete('CASCADE')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('arête_personne__cap_écriture_annotation');
    await knex.schema.dropTable('cap_écriture_annotation');
};
