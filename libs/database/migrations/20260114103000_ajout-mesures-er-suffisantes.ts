import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table
      .boolean("mesures_er_suffisantes")
      .comment(
        `Appréciation de l'instructrice. Indique si les mesures d'évitement et de réduction (ER) sont suffisantes pour éviter une demande de dérogation. Ce champ est lié au champ ddep_nécessaire.`,
      );

    table
      .boolean("mesures_erc_prévues")
      .comment(
        `Appréciation du pétitionnaire. Indique si des mesures ERC (Éviter, Réduire, Compenser) sont prévues`,
      )
      .alter({ alterNullable: false, alterType: false });
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("mesures_er_suffisantes");

    table
      .boolean("mesures_erc_prévues")
      .comment(`Indique si des mesures ERC (Éviter, Réduire, Compenser) sont prévues`)
      .alter({ alterNullable: false, alterType: false });
  });
}
