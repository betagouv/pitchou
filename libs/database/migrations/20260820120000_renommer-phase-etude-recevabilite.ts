import type { Knex } from "knex";

const ancienNom = "Étude recevabilité DDEP";
const nouveauNom = "Étude recevabilité";

export async function up(knex: Knex) {
  await knex("evenement_phase_dossier").update("phase", nouveauNom).where({ phase: ancienNom });
}

export async function down(knex: Knex) {
  await knex("evenement_phase_dossier").update("phase", ancienNom).where({ phase: nouveauNom });
}
