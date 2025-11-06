/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.raw(`
        update dossier
        set départements = to_json(array(
            select * from json_array_elements(départements) as a where json_typeof(a) != 'null'
        ))
        where (
            select count(*) from  json_array_elements(départements) as a where json_typeof(a) = 'null'
        ) > 0;
    `)
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    console.warn('Cette migration ne peut pas être défaite')
};
