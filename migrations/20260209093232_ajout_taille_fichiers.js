/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.alterTable('fichier', (table) => {
        table.bigint('taille')
    })

    await knex.raw(`UPDATE fichier SET taille = length(contenu)`)

    await knex.raw(`
        DROP TRIGGER IF EXISTS supprimer_fichiers_avis_expert_trigger ON public.avis_expert;
        DROP FUNCTION IF EXISTS supprimer_fichiers_avis_expert();
    `)

    await knex.raw(`
        DROP TRIGGER IF EXISTS supprimer_fichiers_avis_expert_orphelins_trigger ON public.avis_expert;
        DROP FUNCTION IF EXISTS supprimer_fichiers_avis_expert_orphelins();
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('fichier', (table) => {
        table.dropColumn('taille')
    })
}
