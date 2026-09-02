import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier_cnpn_email_sent_event", (table) => {
    table.timestamp("delivered_at", { useTz: true }).nullable();
    table.timestamp("opened_at", { useTz: true }).nullable();
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier_cnpn_email_sent_event", (table) => {
    table.dropColumns("delivered_at", "opened_at");
  });
}
