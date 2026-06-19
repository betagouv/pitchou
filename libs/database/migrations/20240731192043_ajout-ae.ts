import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.boolean("rattaché_au_régime_ae");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("rattaché_au_régime_ae");
  });
}
