/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    function (table) {
      table.unique(["dossier", "fichier"], { indexName: "arête_dossier_pj_pétitionnaire_unique" });
    },
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    function (table) {
      table.dropUnique(["dossier", "fichier"], "arête_dossier_pj_pétitionnaire_unique");
    },
  );
}
