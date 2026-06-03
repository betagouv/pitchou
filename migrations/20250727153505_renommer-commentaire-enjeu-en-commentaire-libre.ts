import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.renameColumn("commentaire_enjeu", "commentaire_libre");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.renameColumn("commentaire_libre", "commentaire_enjeu");
  });
}
