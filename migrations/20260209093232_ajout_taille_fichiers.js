/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.alterTable('fichier', (table) => {
        table.integer('taille')
    })

    await knex.raw(`UPDATE fichier SET taille = length(contenu)`)
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
