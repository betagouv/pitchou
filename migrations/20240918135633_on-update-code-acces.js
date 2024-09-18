/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.alterTable('arête_personne__cap_écriture_annotation', function (table) {
        table.dropForeign('personne_cap')
        table.dropForeign('écriture_annotation_cap')

        table.foreign('personne_cap')
            .references('code_accès').inTable('personne').onUpdate('CASCADE').onDelete('CASCADE')
        
        table.foreign('écriture_annotation_cap')
            .references('cap').inTable('cap_écriture_annotation').onUpdate('CASCADE').onDelete('CASCADE')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    
    await knex.schema.alterTable('arête_personne__cap_écriture_annotation', function (table) {
        table.dropForeign('personne_cap')
        table.dropForeign('écriture_annotation_cap')

        table.foreign('personne_cap')
            .references('code_accès').inTable('personne').onUpdate('NO ACTION').onDelete('NO ACTION')
        
        table.foreign('écriture_annotation_cap')
            .references('cap').inTable('cap_écriture_annotation').onUpdate('NO ACTION').onDelete('NO ACTION')
    });

};
