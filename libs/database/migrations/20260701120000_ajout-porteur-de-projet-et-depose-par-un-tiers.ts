import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .json("porteur_de_projet")
      .nullable()
      .comment(
        `Données du porteur de projet (le « demandeur » dans la nomenclature Démarche Numérique) : personne physique ou morale.`,
      );

    table
      .boolean("depose_par_un_tiers")
      .nullable()
      .comment(
        `Indique si le dossier a été déposé par un tiers (mandataire) et non par le demandeur lui-même.`,
      );
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("porteur_de_projet");
    table.dropColumn("depose_par_un_tiers");
  });
}
