import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.json("départements");
    table.json("communes");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumns("départements", "communes");
  });
}
