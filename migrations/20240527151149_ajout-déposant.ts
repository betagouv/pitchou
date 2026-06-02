import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.integer("déposant").unsigned().index();
    table.foreign("déposant").references("id").inTable("personne");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("déposant");
  });
}
