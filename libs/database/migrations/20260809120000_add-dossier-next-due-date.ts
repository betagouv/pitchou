import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table
      .date("next_due_date")
      .comment(
        "Date of the dossier's next échéance, set by the instructeurs to prioritise their work. Null when no échéance is planned.",
      );
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("next_due_date");
  });
}
