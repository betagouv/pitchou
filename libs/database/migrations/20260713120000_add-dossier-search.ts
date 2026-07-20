import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("dossier_search", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());

    // The personne who ran the search
    table.integer("personne").notNullable();
    table.foreign("personne").references("id").inTable("personne").onDelete("CASCADE");

    table.text("text").notNullable().comment("Text typed in the dossiers search bar");

    // Unlike evenement_metrique.date (day resolution), a real timestamp so recency
    // ordering is precise
    table
      .timestamp("date", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment("Date and time of the search");

    table.index(["personne", "date"]);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("dossier_search");
}
