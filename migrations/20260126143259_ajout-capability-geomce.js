/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('capability-geomce', function (table) {
        table.uuid('secret').defaultTo(knex.fn.uuid()).notNullable().primary()
            .comment(`Cette table n'a qu'une seule ligne, une seule valeur`);
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('capability-geomce');
};
