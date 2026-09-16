import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("commentaire", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table
      .integer("personne")
      .comment(
        "Author of the comment. Null for the comment migrated from the dossier's former free comment, displayed as « initial ».",
      );
    table.foreign("personne").references("id").inTable("personne").onDelete("SET NULL");

    table.text("content").notNullable();

    table
      .dateTime("created_at")
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment("Date on which the comment was written");

    table
      .dateTime("updated_at")
      .comment("Date of the last edit, null when the comment was never edited");
  });

  // The former free comment of each dossier becomes its first comment. The
  // column is kept: the dossier list, the tableau de suivi, the document
  // generation and the DN synchronization still read it.
  await knex.raw(`
    INSERT INTO commentaire (dossier, personne, content, created_at)
    SELECT id, NULL, free_comment, NOW()
    FROM dossier
    WHERE free_comment IS NOT NULL AND trim(free_comment) <> ''
  `);
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("commentaire");
}
