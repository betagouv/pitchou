import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("attachment_autre", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table.uuid("fichier").notNullable().index();
    table.foreign("fichier").references("id").inTable("fichier").onDelete("CASCADE");

    table.text("type").notNullable();
    table.date("attachment_date");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("attachment_autre");
}
