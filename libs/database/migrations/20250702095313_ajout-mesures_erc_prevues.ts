import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.boolean("mesures_erc_prévues");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("mesures_erc_prévues");
  });
}
