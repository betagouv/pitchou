const ancienNom = "Vérification du dossier";
const nouveauNom = "Étude recevabilité DDEP";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex("évènement_phase_dossier").update("phase", nouveauNom).where({ phase: ancienNom });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex("évènement_phase_dossier").update("phase", ancienNom).where({ phase: nouveauNom });
}
