import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    // un dossier doit toujours avoir une date de dépôt
    table.dropNullable("date_dépôt");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.setNullable("date_dépôt");
  });
}
