import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("évènement_métrique", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());

    // Lien vers la personne liée à l’évènement
    table.integer("personne").notNullable().index();
    table.foreign("personne").references("id").inTable("personne").onDelete("CASCADE");

    table
      .date("date")
      .notNullable()
      .defaultTo(knex.fn.now())
      .index()
      .comment("Date de l’évènement");

    table.string("évènement").notNullable().comment("Type de l’évènement");

    table.jsonb("détails").comment("Données structurées liées donnant des détails sur l’évènement");
  });

  await knex.schema.createTable("cap_évènement_métrique", function (table) {
    table.uuid("cap").primary().defaultTo(knex.fn.uuid());
    table.string("personne_cap").unique().notNullable().index();
    table
      .foreign("personne_cap")
      .references("code_accès")
      .inTable("personne")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
  });

  await knex.raw(`
        insert into "cap_évènement_métrique" (personne_cap) select code_accès from personne where code_accès is not null;
    `);
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("évènement_métrique");
  await knex.schema.dropTable("cap_évènement_métrique");
}
