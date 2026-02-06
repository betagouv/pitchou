/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('notification', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        table.boolean('vue').comment("Indique si la personne a consulté ou non la notification")

        table.date('date').comment("Date à laquelle la notification est apparue.")

        table.integer('personne').notNullable().index();
        table.foreign('personne')
            .references('id').inTable('personne').onDelete('CASCADE');

        table.integer('dossier').notNullable().index();
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('notification');
};
