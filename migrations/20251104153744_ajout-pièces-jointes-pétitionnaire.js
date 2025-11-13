/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('arête_dossier__fichier_pièces_jointes_pétitionnaire', function (table) {

        table.integer('dossier').notNullable().index();
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE');

        table.uuid('fichier').notNullable().index();
        table.foreign('fichier')
            .references('id').inTable('fichier').onDelete('CASCADE');
            
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('arête_dossier__fichier_pièces_jointes_pétitionnaire');
};
