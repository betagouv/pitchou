import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("groupe_instructeurs", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("nom").notNullable();
  });

  await knex.schema.createTable("arête_groupe_instructeurs__personne", function (table) {
    table.uuid("groupe_instructeurs").notNullable().index();
    table
      .foreign("groupe_instructeurs")
      .references("id")
      .inTable("groupe_instructeurs")
      .onDelete("CASCADE");

    table.integer("personne").notNullable().index();
    table.foreign("personne").references("id").inTable("personne").onDelete("CASCADE");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("arête_groupe_instructeurs__personne");
  await knex.schema.dropTable("groupe_instructeurs");
}
