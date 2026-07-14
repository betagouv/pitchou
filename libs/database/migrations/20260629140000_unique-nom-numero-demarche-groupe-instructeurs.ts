import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("groupe_instructeurs", (table) => {
    table.dropUnique(["nom"]);
    table.unique(["nom", "numéro_démarche"]);
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("groupe_instructeurs", (table) => {
    table.dropUnique(["nom", "numéro_démarche"]);
    table.unique(["nom"]);
  });
}
