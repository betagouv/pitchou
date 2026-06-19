import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("historique_décision");
    table.dropColumn("historique_date_signature_arrêté_préfectoral");
    table.dropColumn("historique_référence_arrêté_préfectoral");
    table.dropColumn("historique_date_signature_arrêté_ministériel");
    table.dropColumn("historique_référence_arrêté_ministériel");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.string("historique_décision");
    table.date("historique_date_signature_arrêté_préfectoral");
    table.string("historique_référence_arrêté_préfectoral");
    table.date("historique_date_signature_arrêté_ministériel");
    table.string("historique_référence_arrêté_ministériel");
  });
}
