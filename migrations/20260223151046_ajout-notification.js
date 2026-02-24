/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('notification', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        table.dateTime('date_dernière_mise_à_jour').defaultTo(knex.fn.now()).comment("Date à laquelle la notification a été mise à jour pour la dernière fois")

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
        INSERT INTO notification (personne, dossier, date_dernière_mise_à_jour, vue)
SELECT
    personne, 
    dossier, 
    NOW() AS date_dernière_mise_à_jour, 
    TRUE AS vue
FROM arête_personne_suit_dossier;`);

    await knex.schema.createTable('cap_notification', function (table) {
        table.uuid('cap').primary().defaultTo(knex.fn.uuid());
        table.string('personne_cap').unique().notNullable().index();
        table.foreign('personne_cap')
            .references('code_accès').inTable('personne').onDelete('CASCADE').onUpdate('CASCADE');
    });

    await knex.raw(`
        insert into "cap_notification" (personne_cap) select code_accès from personne where code_accès is not null;
    `);

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('notification');
    await knex.schema.dropTable('cap_notification');
};
