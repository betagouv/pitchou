import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.string("phase");
    table.string("prochaine_action_attendue_par");
    table.string("prochaine_action_attendue");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("phase");
    table.dropColumn("prochaine_action_attendue_par");
    table.dropColumn("prochaine_action_attendue");
  });
}
