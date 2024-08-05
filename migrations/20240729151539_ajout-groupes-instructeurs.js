/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('groupe_instructeurs', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid())
        table.string('nom').notNullable()
    });

    await knex.schema.createTable('arête_groupe_instructeurs__personne', function (table) {
        table.uuid('groupe_instructeurs').notNullable().index()
        table.foreign('groupe_instructeurs')
            .references('id').inTable('groupe_instructeurs')
            .onDelete('CASCADE')

        table.integer('personne').notNullable().index()
        table.foreign('personne')
            .references('id').inTable('personne')
            .onDelete('CASCADE')
    });

};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('arête_groupe_instructeurs__personne');
    await knex.schema.dropTable('groupe_instructeurs');
};