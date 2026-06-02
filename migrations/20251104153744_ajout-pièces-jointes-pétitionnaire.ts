import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    function (table) {
      table.integer("dossier").notNullable().index();
      table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

      table.uuid("fichier").notNullable().index();
      table.foreign("fichier").references("id").inTable("fichier").onDelete("CASCADE");
    },
  );
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("arête_dossier__fichier_pièces_jointes_pétitionnaire");
}
