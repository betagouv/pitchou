import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.text("espèces_protégées_concernées").alter();
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.string("espèces_protégées_concernées").alter();
  });
}
