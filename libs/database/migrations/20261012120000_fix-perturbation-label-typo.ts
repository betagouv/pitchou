import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex("impact_type")
    .where({ identifiant_pitchou: "P-6" })
    .update({ libelle_pitchou: "Perturbation intentionnelle, effarouchement" });
  await knex("impact_type")
    .where({ identifiant_pitchou: "P-40" })
    .update({ libelle_pitchou: "Perturbation, effarouchement" });
}

export async function down(knex: Knex) {
  await knex("impact_type")
    .where({ identifiant_pitchou: "P-6" })
    .update({ libelle_pitchou: "Peturbation intentionnelle, effarouchement" });
  await knex("impact_type")
    .where({ identifiant_pitchou: "P-40" })
    .update({ libelle_pitchou: "Peturbation, effarouchement" });
}
