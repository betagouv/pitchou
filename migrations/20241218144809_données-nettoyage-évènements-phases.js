import { phases } from "../scripts/front-end/affichageDossier.ts";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex("évènement_phase_dossier")
    .whereNotIn("phase", [...phases])
    .delete();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // rien
}
