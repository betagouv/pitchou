import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table
      .text("location_scope")
      .comment(
        "Geographic level selected for the project: communes, departements, regions, or france",
      );
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("location_scope");
  });
}
