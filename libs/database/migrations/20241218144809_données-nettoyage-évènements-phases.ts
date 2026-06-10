import type { Knex } from "knex";

import { phases } from "@pitchou/common/phases.ts";

export async function up(knex: Knex) {
  await knex("évènement_phase_dossier")
    .whereNotIn("phase", [...phases])
    .delete();
}

// @ts-ignore migration historique : paramètre knex inutilisé
export async function down(knex: Knex) {
  // rien
}
