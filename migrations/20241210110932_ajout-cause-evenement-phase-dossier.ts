import type { Knex } from "knex";

export async function up(knex: Knex) {
  // Vider les données existantes parce qu'elles contenaient les phases DS
  // alors que "phase" devrait contenir les phases Pitchou
  await knex("évènement_phase_dossier").delete();

  await knex.schema.alterTable("évènement_phase_dossier", function (table) {
    table.integer("cause_personne").defaultTo(null);
    // Pour le moment, "cause_personne == NULL" va signifier que c'est l'outil de sync DS
    // qui a produit l'évènement de phase

    table.foreign("cause_personne").references("id").inTable("personne").onDelete("CASCADE");
  });

  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumn("phase");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.string("phase"); // des données sont perdues,
    // mais rien d'important n'est stocké actuellement dans cette colonne
  });

  await knex.schema.alterTable("évènement_phase_dossier", function (table) {
    table.dropColumn("cause_personne");
  });
}
