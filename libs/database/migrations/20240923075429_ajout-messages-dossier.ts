import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("message", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.text("contenu");
    // Second precision.
    table.datetime("date", { precision: 0 });
    table.string("email_expéditeur");
    table.string("id_démarches_simplifiées").unique();

    table.integer("dossier").index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("message");
}
