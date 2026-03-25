/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.createTable('déclaration_espèces_impactées', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.uuid('fichier')
            .references('fichier.id')
            .notNullable();
        table.integer('dossier')
            .references('dossier.id')
            .onDelete('CASCADE')
            .notNullable()
            .unique();
    });

    await knex.raw(`
        CREATE OR REPLACE FUNCTION supprimer_fichier_déclaration_espèces_impactées()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
AS
$$
BEGIN
	DELETE FROM fichier WHERE fichier.id = OLD.fichier;
	return OLD;
END;
$$;

CREATE TRIGGER supprimer_fichier_déclaration_espèces_impactées_trigger
	AFTER DELETE
	ON "déclaration_espèces_impactées"
	FOR EACH ROW
EXECUTE PROCEDURE supprimer_fichier_déclaration_espèces_impactées();
    `);

    return knex.schema.createTable('espèce_impactée', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.string('CD_REF')
            .comment(`CD_REF est l'identifiant de l'espèce donné par le fichier TAX_REF.`)
            .notNullable();
        table.string('activité').comment(`Identifiant Pitchou qui dérive des identifiants du fichier .xsd créé pour le rapportage européen (cf https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd).`);
        table.string('méthode').comment(`Identifiant Pitchou qui dérive des identifiants du fichier .xsd créé pour le rapportage européen (cf https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd).`);
        table.string('moyen_de_poursuite').comment(`Identifiant Pitchou qui dérive des identifiants du fichier .xsd créé pour le rapportage européen (cf https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd).`);
        table.integer('nombre_individus_min').comment(`Le nombre minimum d'individus impactées.`);
        table.integer('nombre_individus_max').comment(`Le nombre maximum d'individus impactées.`);
        table.integer('surface_habitat_détruit').comment(`Surface d'habitat détruit en m²`);
        table.integer('nombre_nids_min').comment(`Nombre minimal de nids impactés.`);
        table.integer('nombre_nids_max').comment(`Nombre maximal de nids impactés.`);
        table.integer('nombre_œufs_min').comment(`Nombre minimal d'œufs impactés.`);
        table.integer('nombre_œufs_max').comment(`Nombre maximal d'œufs impactés.`);
        table.uuid('déclaration_espèces_impactées')
            .references('déclaration_espèces_impactées.id')
            .onDelete('CASCADE')
            .notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('espèce_impactée');

    await knex.raw(`
DROP TRIGGER IF EXISTS supprimer_fichier_déclaration_espèces_impactées_trigger 
ON public.déclaration_espèces_impactées;

DROP FUNCTION IF EXISTS supprimer_fichier_déclaration_espèces_impactées();
`)
    return await knex.schema.dropTable('déclaration_espèces_impactées');
};
