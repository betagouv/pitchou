import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(`
        UPDATE dossier
        SET commentaire_libre = ''
        WHERE commentaire_libre IS NULL;
    `);

  await knex.schema.alterTable("dossier", async function (table) {
    table.text("commentaire_libre").notNullable().defaultTo("").alter();
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.text("commentaire_libre").nullable().alter();
  });
}
