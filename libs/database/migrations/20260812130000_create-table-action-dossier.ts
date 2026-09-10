import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("action_dossier", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table
      .text("type")
      .notNullable()
      .comment("Kind of action, e.g. 'phase_renseignee' or 'commentaire_ajoute'");

    table
      .jsonb("data")
      .notNullable()
      .defaultTo("{}")
      .comment("Type-specific details: field label, new value, follower email…");

    table
      .integer("author_personne")
      .comment("Instructeur behind the action, null for pétitionnaire or system actions");
    table.foreign("author_personne").references("id").inTable("personne").onDelete("SET NULL");

    table
      .boolean("author_petitionnaire")
      .notNullable()
      .defaultTo(false)
      .comment("True when the action comes from the pétitionnaire via the form platform");

    table
      .dateTime("created_at")
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment("Date on which the action happened");

    table.index(["dossier", "created_at"]);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("action_dossier");
}
