import type { Knex } from "knex";

const ancienNom = "Vérification du dossier";
const nouveauNom = "Étude recevabilité DDEP";

export async function up(knex: Knex) {
  await knex("évènement_phase_dossier").update("phase", nouveauNom).where({ phase: ancienNom });
}

export async function down(knex: Knex) {
  await knex("évènement_phase_dossier").update("phase", ancienNom).where({ phase: nouveauNom });
}
