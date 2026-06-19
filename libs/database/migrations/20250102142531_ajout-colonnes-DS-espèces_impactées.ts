import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("espèces_impactées", function (table) {
    /**
     * Ces colonnes stockent les valeurs directement fournies par l'API DS
     * Elles ont surtout pour objectif de déterminer si un fichier doit être
     * téléchargé à nouveau ou si nous avons déjà la bonne version
     */

    table.string("DS_checksum").index();
    table.datetime("DS_createdAt").index();
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("espèces_impactées", function (table) {
    table.dropColumn("DS_checksum");
    table.dropColumn("DS_createdAt");
  });
}
