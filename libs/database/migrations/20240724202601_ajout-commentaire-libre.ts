import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.renameColumn("commentaire", "commentaire_enjeu");
    table.text("commentaire_libre");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("commentaire_libre");
    table.renameColumn("commentaire_enjeu", "commentaire");
  });
}
