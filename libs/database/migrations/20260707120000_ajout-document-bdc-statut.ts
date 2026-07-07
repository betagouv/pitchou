import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("espece_bdc_statut", function (table) {
    table.text("cd_doc").notNullable().defaultTo("");
    table.text("full_citation").notNullable().defaultTo("");
    table.text("doc_url").notNullable().defaultTo("");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("espece_bdc_statut", function (table) {
    table.dropColumn("doc_url");
    table.dropColumn("full_citation");
    table.dropColumn("cd_doc");
  });
}
