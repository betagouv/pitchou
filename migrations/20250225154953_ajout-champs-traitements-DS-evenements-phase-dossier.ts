import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("évènement_phase_dossier", function (table) {
    table.string("DS_emailAgentTraitant");
    table.text("DS_motivation");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("évènement_phase_dossier", function (table) {
    table.dropColumn("DS_emailAgentTraitant");
    table.dropColumn("DS_motivation");
  });
}
