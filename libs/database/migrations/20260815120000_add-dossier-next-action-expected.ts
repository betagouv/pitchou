import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .text("next_action_expected")
      .comment(
        "Next expected action, e.g. 'Compléter le dossier'; the available values depend on next_action_expected_from",
      );
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("next_action_expected");
  });
}
