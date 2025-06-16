/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('décision_administrative', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid())

        // un dossier peut avoir plusieurs décision_administrative
        table.integer('dossier').notNullable().index()
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE')

        // identifiant   s administratif
        table.string('numéro').index()
        table.string('type')

        table.date('date_signature')
        table.date('date_fin_obligations')

        table.uuid('fichier')
        table.foreign('fichier')
            .references('id').inTable('fichier')

        table.unique(['dossier', 'numéro'])
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('décision_administrative');
};
