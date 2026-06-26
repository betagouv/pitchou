import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("historique_date_envoi_dernière_contribution");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .date("historique_date_envoi_dernière_contribution")
      .nullable()
      .comment("Date d'envoi de la dernière contribution");
  });
}
