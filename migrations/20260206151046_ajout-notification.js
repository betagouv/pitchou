/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('notification', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        table.dateTime('updated_at').comment("Date à laquelle la notification a été mise à jour pour la dernière fois").defaultTo(knex.fn.now())

        table.integer('personne').notNullable().index();
        table.foreign('personne')
            .references('id').inTable('personne').onDelete('CASCADE');

        table.integer('dossier').notNullable().index();
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE');

        table.unique(['dossier', 'personne'])
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('notification');
};
