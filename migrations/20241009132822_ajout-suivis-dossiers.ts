import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("arête_personne_suit_dossier", function (table) {
    table.integer("personne").notNullable().index();
    table.foreign("personne").references("id").inTable("personne").onDelete("CASCADE");

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("arête_personne_suit_dossier");
}
