/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('prescription', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid())

        table.uuid('décision_administrative').notNullable().index()
        table.foreign('décision_administrative')
            .references('id').inTable('décision_administrative').onDelete('CASCADE')

        table.date('date_échéance')
        table.string('numéro_article')
        table.text('description')

        table.integer('surface_évitée').comment('en m²')
        table.integer('surface_compensée').comment('en m²')
        table.integer('nids_évités')
        table.integer('nids_compensés')
        table.integer('individus_évités')
        table.integer('individus_compensés')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('prescription');
};
