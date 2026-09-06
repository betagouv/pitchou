import type { Knex } from "knex";

const CODE = "carrieres-alluvionnaires";
const LABEL = "Carrières de matériaux alluvionnaires";

export async function up(knex: Knex) {
  await knex("activite").insert({
    code: CODE,
    label: LABEL,
    groupe_code: "activite-economique",
  });

  // Adopt labels detected by DN sync without overriding an administrator's reviewed mapping.
  await knex("activite_label")
    .insert({ label: LABEL, activite_code: CODE, needs_review: false })
    .onConflict("label")
    .merge({ activite_code: CODE, needs_review: false })
    .where("activite_label.needs_review", true);
}

export async function down(knex: Knex) {
  // Keep raw labels resolvable for existing dossiers, including any aliases added since deployment.
  await knex("activite_label")
    .where({ activite_code: CODE })
    .update({ activite_code: "autre", needs_review: true });
  await knex("activite").where({ code: CODE }).delete();
}
