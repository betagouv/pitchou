import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("résultat_synchronisation_DS_88444", function (table) {
    table.boolean("succès").notNullable().unique();
    // Second precision.
    table.datetime("horodatage", { precision: 0 }).notNullable();
    table.text("erreur");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("résultat_synchronisation_DS_88444");
}
