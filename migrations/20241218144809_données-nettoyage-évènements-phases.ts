import type { Knex } from "knex";

import { phases } from "../scripts/front-end/affichageDossier.ts";

export async function up(knex: Knex) {
  await knex("évènement_phase_dossier")
    .whereNotIn("phase", [...phases])
    .delete();
}

export async function down(knex: Knex) {
  // rien
}
