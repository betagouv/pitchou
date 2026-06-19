import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(`
        update dossier
        set départements = to_json(array(
            select * from json_array_elements(départements) as a where json_typeof(a) != 'null'
        ))
        where (
            select count(*) from  json_array_elements(départements) as a where json_typeof(a) = 'null'
        ) > 0;
    `);
}

// @ts-ignore migration historique : paramètre knex inutilisé
export async function down(knex: Knex) {
  console.warn("Cette migration ne peut pas être défaite");
}
