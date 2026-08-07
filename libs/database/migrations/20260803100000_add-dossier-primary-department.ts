import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.text("primary_department").comment("Department in which most of the project is located");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("primary_department");
  });
}
