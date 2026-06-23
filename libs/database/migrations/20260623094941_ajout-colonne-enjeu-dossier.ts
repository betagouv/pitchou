import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .boolean("enjeu")
      .notNullable()
      .defaultTo(false)
      .comment(`Indique si le dossier présente un enjeu (écologique, politique...).`);
  });

  await knex.raw(`
    UPDATE dossier
    SET enjeu = (enjeu_politique IS TRUE OR enjeu_écologique IS TRUE)
  `);
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("enjeu");
  });
}
