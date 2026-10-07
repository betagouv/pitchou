import type { Knex } from "knex";

/**
 * Structure the porteur de projet of a dossier: either a personne physique or a
 * personne morale (entreprise). The legacy demandeur_personne_physique /
 * demandeur_personne_morale columns are kept and still read for now.
 */
export async function up(knex: Knex) {
  // No unique constraint yet: we do not know how to recognize the same personne
  // physique across dossiers. The email alone is not enough: two colleagues of a
  // bureau d'études can share contact@bureau-etudes.fr while being two different
  // people. Conversely, the same person can use their professional email in one
  // dossier and their personal email in another. Last and first names are not
  // enough either, because of homonyms.
  await knex.schema.createTable("personne_physique", (table) => {
    table.comment("Contains the natural persons that can be linked to one or more dossiers.");

    table.increments("id").primary();
    table.string("first_names");
    table.string("last_name");
    table.string("email");
    table.string("address").comment("Postal address description");
    table.string("phone");
    table
      .string("role")
      .comment("Functions / professional titles / roles of the person or contact (free text)");
  });

  await knex.schema.createTable("porteur_de_projet", (table) => {
    table.comment(
      'Contains the porteurs de projet, also called "bénéficiaire": the party that may benefit from the derogation request. Either a personne physique, or a personne morale (association, company, local authority).',
    );

    table.increments("id").primary();

    table.integer("personne_physique").index();
    table
      .foreign("personne_physique")
      .references("id")
      .inTable("personne_physique")
      .onDelete("RESTRICT");

    table.string("personne_morale", 14).index();
    table.foreign("personne_morale").references("siret").inTable("entreprise").onDelete("RESTRICT");

    // Exactly one of the two references
    table.check("num_nonnulls(personne_physique, personne_morale) = 1");
  });

  // Nullable for now, until a later migration makes it NOT NULL:
  // - existing dossiers are filled afterwards by a full Démarche Numérique resync;
  // - imported dossiers (gunenv, onagre, import_fichier) and dossiers created in
  //   the admin are not handled yet;
  // - a Démarche Numérique dossier has no porteur when "Le demandeur est…" is not
  //   answered, or for a personne morale when no SIRET was entered.
  await knex.schema.alterTable("dossier", (table) => {
    table.integer("porteur_de_projet").index().comment("Porteur de projet of the dossier.");
    table
      .foreign("porteur_de_projet")
      .references("id")
      .inTable("porteur_de_projet")
      .onDelete("RESTRICT");
  });

  // A porteur_de_projet is only a link to a personne physique or an entreprise, so
  // deleting it once no dossier references it loses no business data. The
  // referenced personne_physique or entreprise is kept. A trigger rather than
  // application code, because several writers change this column (Démarche
  // Numérique synchronization, admin, dossier deletion).
  await knex.raw(`
CREATE OR REPLACE FUNCTION delete_orphan_porteur_de_projet()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS
$$
BEGIN
	DELETE FROM porteur_de_projet
	WHERE id = OLD.porteur_de_projet
		AND NOT EXISTS (SELECT 1 FROM dossier WHERE porteur_de_projet = OLD.porteur_de_projet);
	RETURN NULL;
END;
$$;

CREATE TRIGGER delete_orphan_porteur_de_projet_trigger
	AFTER UPDATE OF porteur_de_projet OR DELETE
	ON dossier
	FOR EACH ROW
EXECUTE PROCEDURE delete_orphan_porteur_de_projet();
`);
}

export async function down(knex: Knex) {
  await knex.raw(`
DROP TRIGGER IF EXISTS delete_orphan_porteur_de_projet_trigger ON dossier;
DROP FUNCTION IF EXISTS delete_orphan_porteur_de_projet();
`);

  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("porteur_de_projet");
  });

  await knex.schema.dropTable("porteur_de_projet");
  return knex.schema.dropTable("personne_physique");
}
