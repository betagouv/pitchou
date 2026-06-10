import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.renameTable("espèces_impactées", "fichier");

  await knex.schema.alterTable("dossier", function (table) {
    table.uuid("espèces_impactées");
    table.foreign("espèces_impactées").references("id").inTable("fichier").onDelete("SET NULL");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("espèces_impactées");
  });

  await knex.schema.renameTable("fichier", "espèces_impactées");
}
