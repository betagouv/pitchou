import type { Knex } from "knex";

/**
 * Store the "Porteur de projet" identities as per-dossier snapshots in a dedicated
 * child table instead of links to the personne table.
 *
 * The personne table has a unique constraint on email (it identifies accounts), so it
 * cannot represent two different people sharing one email — which happens routinely in
 * Démarche Numérique dossiers (e.g. the representative's "Adresse mail de contact" being
 * the demandeur's email). Linking by email made the cards display the wrong person.
 *
 * The identity types mirror Démarche Numérique:
 * - 'demandeur': identité du demandeur (identity block, always present)
 * - 'mandataire': identité du mandataire (only when the dossier was deposited par un tiers)
 * - 'representant': représentant of the personne morale (form champs, personne morale only)
 */
export async function up(knex: Knex) {
  await knex.schema.createTable("identite_dossier", function (table) {
    table.increments("id").primary();

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table
      .string("type")
      .notNullable()
      .comment("Identity type: 'demandeur', 'mandataire' or 'representant'");

    table.string("last_name");
    table.string("first_names");
    table.string("email");
    table.string("phone").comment("Only filled for the 'representant' type");
    table
      .string("role")
      .comment("Position within the personne morale, only filled for the 'representant' type");

    table.unique(["dossier", "type"]);
  });

  // Backfill from the previously linked personnes (best data available; a full
  // Démarche Numérique re-sync will overwrite with the exact per-dossier values).
  await knex.raw(`
    INSERT INTO identite_dossier (dossier, type, last_name, first_names, email)
    SELECT dossier.id, 'demandeur', personne.nom, personne."prénoms", personne.email
    FROM dossier
    JOIN personne ON personne.id = dossier."déposant"
  `);

  await knex.raw(`
    INSERT INTO identite_dossier (dossier, type, last_name, first_names, email, phone, role)
    SELECT dossier.id, 'representant', personne.nom, personne."prénoms", personne.email,
           personne.phone, personne.role
    FROM dossier
    JOIN personne ON personne.id = dossier.representative
  `);

  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("representative");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.integer("representative").unsigned().index();
    table.foreign("representative").references("id").inTable("personne");
  });

  return knex.schema.dropTable("identite_dossier");
}
