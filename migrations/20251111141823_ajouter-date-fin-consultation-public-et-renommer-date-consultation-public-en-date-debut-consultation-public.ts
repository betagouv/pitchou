import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table
      .dateTime("date_fin_consultation_public")
      .comment(
        `Valeur pour le champ : "Date de fin de la consultation du public ou enquête publique"`,
      );
    table.renameColumn("date_consultation_public", "date_debut_consultation_public");
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("date_fin_consultation_public");
    table.renameColumn("date_debut_consultation_public", "date_consultation_public");
  });
}
