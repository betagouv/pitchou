import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("espèces_impactées", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.integer("dossier").notNullable().unique();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table.string("nom");
    table.string("media_type"); // https://developer.mozilla.org/en-US/docs/Glossary/MIME_type
    table.binary("contenu");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("espèces_impactées");
}
