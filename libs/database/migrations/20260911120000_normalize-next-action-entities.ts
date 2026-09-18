import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex("dossier")
    .whereIn("next_action_expected_from", ["Autre administration", "Autre"])
    .update({ next_action_expected_from: "Tierce personne/administration" });
  await knex("dossier")
    .where({ next_action_expected_from: "Personne" })
    .update({ next_action_expected_from: null });
}

export async function down() {
  // The merged categories and cleared values cannot be distinguished from existing values.
}
