/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // db-migrate (previous migration tool) data 
  await knex.schema.dropTableIfExists('migrations');
  await knex.schema.dropTableIfExists('dossier');
  await knex.schema.dropTableIfExists('personne');
  

  await knex.schema.createTable('personne', (table) => {
    table.increments('id').primary();
    table.string('nom');
    table.string('prénoms');
    table.string('email').unique();
    table.string('code_accès').unique();
  });

  await knex.schema.createTable('dossier', (table) => {
    table.increments('id').primary();
    table.string('id_demarches_simplifiées').unique();
    table.string('statut');
    table.dateTime('date_dépôt');
    table.string('identité_petitionnaire');
    table.string('espèces_protégées_concernées');
    table.string('enjeu_écologiques');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists('dossier');
  await knex.schema.dropTableIfExists('personne');
};