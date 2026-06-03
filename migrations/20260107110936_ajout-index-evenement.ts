import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.table("évènement_métrique", (table) => {
    table.index("évènement");
  });
}

export function down(knex: Knex) {
  return knex.schema.table("évènement_métrique", (table) => {
    table.dropIndex("évènement");
  });
}
