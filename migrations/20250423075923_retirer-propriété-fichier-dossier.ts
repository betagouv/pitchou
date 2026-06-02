import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("fichier", function (table) {
    table.dropColumn("dossier");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("fichier", function (table) {
    table.integer("dossier");
  });
}
