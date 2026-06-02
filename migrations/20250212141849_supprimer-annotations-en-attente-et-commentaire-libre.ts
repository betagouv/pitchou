import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("en_attente_de");
    table.dropColumn("commentaire_libre");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.string("en_attente_de");
    table.text("commentaire_libre");
  });
}
