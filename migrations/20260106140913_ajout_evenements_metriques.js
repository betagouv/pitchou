/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('évènement_métrique', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        // Lien vers la personne lié à l’évènement
        table.integer('personne').notNullable().index();
        table.foreign('personne')
            .references('id').inTable('personne').onDelete('CASCADE');

        table.date('date').notNullable().defaultTo(knex.fn.now()).index().comment("Date de l’évènement");

        table.string('évènement').notNullable().comment("Type de l’évènement");

        table.jsonb('détails').comment("Données structurées liées donnant des détails sur l’évènement");
    });

    await knex.schema.createTable('cap_évènement_métrique', function (table) {
        table.uuid('cap').primary().defaultTo(knex.fn.uuid());
        table.string('personne_cap').notNullable().index();
        table.foreign('personne_cap')
            .references('code_accès').inTable('personne').onDelete('CASCADE').onUpdate('CASCADE');
    });

    await knex.raw(`
        insert into "cap_évènement_métrique" (personne_cap) select code_accès from personne where code_accès is not null;
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('évènement_métrique');
    await knex.schema.dropTable('cap_évènement_métrique');
};
