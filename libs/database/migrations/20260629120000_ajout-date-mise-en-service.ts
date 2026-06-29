import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .date("date_mise_en_service")
      .nullable()
      .comment("Date de début d'exploitation (mise en service de l'exploitation)");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("date_mise_en_service");
  });
}
