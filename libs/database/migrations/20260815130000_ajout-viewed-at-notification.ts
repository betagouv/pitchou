import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("notification", function (table) {
    table
      .dateTime("viewed_at")
      .comment(
        "Last time the instructeur read the dossier; pétitionnaire actions newer than this drive the « Nouvelles modifications » badges",
      );
  });
  // Dossiers already read are considered read now, so historical pétitionnaire
  // changes do not all resurface as new modifications.
  await knex.raw(`UPDATE notification SET viewed_at = NOW() WHERE viewed`);
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("notification", function (table) {
    table.dropColumn("viewed_at");
  });
}
