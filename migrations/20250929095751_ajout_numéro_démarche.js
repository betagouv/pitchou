/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.alterTable('groupe_instructeurs', (table) => {
        table.integer('numéro_démarche').notNullable().defaultTo(88444);
        table.integer('numéro_démarche').alter().notNullable();
    });

    await knex.schema.alterTable('dossier', (table) => {
        table.integer('numéro_démarche').notNullable().defaultTo(88444);
        table.integer('numéro_démarche').alter().notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.alterTable('groupe_instructeurs', (table) => {
        table.dropColumn('numéro_démarche');
    });

    await knex.schema.alterTable('dossier', (table) => {
        table.dropColumn('numéro_démarche');
    });
};
