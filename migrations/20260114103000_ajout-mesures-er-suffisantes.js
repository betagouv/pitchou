/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.alterTable('dossier', (table) => {
        table
            .boolean('mesures_er_suffisantes')
            .comment(`Indique si les mesures d'évitement et de réduction (ER) sont suffisantes pour éviter une demande de dérogation. Ce champ est lié au champ ddep_nécessaire.`)
    });

    await knex('dossier')
        .update({
            mesures_er_suffisantes: knex.raw(`
                CASE
                    WHEN ddep_nécessaire IS TRUE THEN NULL
                    WHEN ddep_nécessaire IS NULL THEN NULL
                    ELSE mesures_erc_prévues
                END
            `),
        });

    // Contrainte métier: mesures_er_suffisantes doit être NULL si ddep_nécessaire est TRUE ou NULL
    await knex.raw(`
        ALTER TABLE public.dossier
        ADD CONSTRAINT dossier_mesures_er_suffisantes_si_ddep_false
        CHECK (ddep_nécessaire IS FALSE OR mesures_er_suffisantes IS NULL)
    `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.raw(`
        ALTER TABLE public.dossier
        DROP CONSTRAINT IF EXISTS dossier_mesures_er_suffisantes_si_ddep_false
    `);

    await knex.schema.alterTable('dossier', (table) => {
        table.dropColumn('mesures_er_suffisantes');
    });
}

