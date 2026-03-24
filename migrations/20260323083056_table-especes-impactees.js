/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.raw(
        `ALTER TABLE fichier RENAME CONSTRAINT espèces_impactées_pkey TO fichier_pkey`
    )

    return knex.schema.createTable('espèces_impactées', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.string('CD_REF').comment(`CD_REF est l'identifiant de l'espèce donné par le fichier TAX_REF.`);
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
        table.uuid('fichier')
            .references('fichier.id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    return knex.schema.dropTable('espèces_impactées');
};
