/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.raw('delete from personne where id in (3679399, 3648859)')
    await knex.raw('update personne set email = lower(email)')
};

/**
 * @param { import("knex").Knex } _knex
 * @returns { Promise<void> }
 */
export async function down(_knex) {
    console.warn('Cette migration ne peut pas être défaite')
};
