/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.raw(`ALTER TABLE dossier
ALTER COLUMN ddep_nécessaire TYPE BOOLEAN USING
  CASE
    WHEN ddep_nécessaire = 'Oui' THEN TRUE
    WHEN ddep_nécessaire = 'Non' THEN FALSE
    ELSE NULL
  END;`)

    await knex.schema.alterTable('dossier', (table) => {
        table.boolean('ddep_nécessaire')
            .comment(`Indique si une demande de dérogation est nécessaire pour ce dossier.`)
            .alter({ alterNullable: false, alterType: false });
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {

    await knex.raw(`ALTER TABLE dossier
ALTER COLUMN ddep_nécessaire TYPE VARCHAR USING
  CASE
    WHEN ddep_nécessaire = TRUE THEN 'Oui'
    WHEN ddep_nécessaire = FALSE THEN 'Non'
    ELSE NULL
  END;`)

    await knex.schema.alterTable('dossier', (table) => {
        table.string('ddep_nécessaire')
            .comment(`Indique si une demande de dérogation est nécessaire pour ce dossier (Oui, Non, à déterminer).`)
            .alter({ alterNullable: false, alterType: false });
    })

};
