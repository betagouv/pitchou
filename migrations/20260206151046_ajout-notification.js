/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('notification', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        table.dateTime('updated_at').defaultTo(knex.fn.now()).comment("Date à laquelle la notification a été mise à jour pour la dernière fois")

        table.boolean('vue').notNullable().defaultTo(false).comment("Indique si la personne a consulté ou non la notification")

        table.integer('personne').notNullable().index();
        table.foreign('personne')
            .references('id').inTable('personne').onDelete('CASCADE');

        table.integer('dossier').notNullable().index();
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE');

        table.unique(['dossier', 'personne'])
    });

    await knex.raw(`
        INSERT INTO notification (personne, dossier, updated_at, vue)
SELECT
    personne, 
    dossier, 
    NOW() AS updated_at, 
    TRUE AS vue
FROM arête_personne_suit_dossier;`)
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('notification');
};
