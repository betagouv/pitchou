import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("arête_personne_suit_dossier", (table) => {
    table.unique(["dossier", "personne"]);
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("arête_personne_suit_dossier", (table) => {
    table.dropUnique(["dossier", "personne"]);
  });
}
