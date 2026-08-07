import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table
      .text("source")
      .notNullable()
      .defaultTo("unknown")
      .index()
      .comment("Explicit dossier provenance. Unknown is the safe default for legacy imports.");
  });

  await knex("dossier")
    .whereNotNull("demarche_numerique_id")
    .orWhereNotNull("demarche_numerique_number")
    .update({ source: "demarche_numerique" });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("source");
  });
}
