import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    function (table) {
      table.unique(["dossier", "fichier"], { indexName: "arête_dossier_pj_pétitionnaire_unique" });
    },
  );
}

export async function down(knex: Knex) {
  await knex.schema.alterTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    function (table) {
      table.dropUnique(["dossier", "fichier"], "arête_dossier_pj_pétitionnaire_unique");
    },
  );
}
