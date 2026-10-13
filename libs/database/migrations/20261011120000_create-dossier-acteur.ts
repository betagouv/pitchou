import type { Knex } from "knex";

/**
 * The people involved in a dossier other than its porteur de projet (déposant,
 * mandataire, personne contact…). Existing dossiers are filled by a full Démarche
 * Numérique resync.
 */
export async function up(knex: Knex) {
  await knex.schema.createTable("dossier_acteur", (table) => {
    table.comment(
      "Links a dossier to a personne physique involved in it (déposant, mandataire, personne contact...). A person can have several involvements in the same dossier, and an involvement can be held by several people.",
    );

    table.increments("id").primary();

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    // Free text until the list of involvements is settled; the known values are typed in the code.
    table
      .string("involvement")
      .notNullable()
      .comment("How the person is involved in the dossier (deposant, mandataire…)");

    table.integer("personne_physique").notNullable().index();
    table
      .foreign("personne_physique")
      .references("id")
      .inTable("personne_physique")
      .onDelete("RESTRICT");
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable("dossier_acteur");
}
