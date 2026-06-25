import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("enjeu_politique");
    table.dropColumn("enjeu_écologique");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .boolean("enjeu_politique")
      .nullable()
      .comment("Indique si le dossier présente un enjeu politique");
    table
      .boolean("enjeu_écologique")
      .nullable()
      .comment("Indique si le dossier présente un enjeu écologique");
  });
}
