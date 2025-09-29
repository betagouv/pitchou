/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('groupe_instructeurs', (table) => {
        table.integer('numéro_démarche').notNullable().defaultTo(88444);
        table.integer('numéro_démarche').alter().notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('groupe_instructeurs', (table) => {
        table.dropColumn('numéro_démarche');
    });
};
