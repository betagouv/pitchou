import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier_cnpn_email_sent_event", (table) => {
    table.timestamp("read_receipt_claimed_at", { useTz: true }).nullable();
    table.timestamp("read_receipt_sent_at", { useTz: true }).nullable();
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier_cnpn_email_sent_event", (table) => {
    table.dropColumns("read_receipt_claimed_at", "read_receipt_sent_at");
  });
}
