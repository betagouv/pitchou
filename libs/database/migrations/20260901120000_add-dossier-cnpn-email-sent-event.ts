import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("dossier_cnpn_email_sent_event", (table) => {
    table.uuid("id").primary();
    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");
    table.integer("sent_by").nullable().index();
    table.foreign("sent_by").references("id").inTable("personne").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("sent_at", { useTz: true }).nullable().index();
    table.text("status").notNullable().defaultTo("pending");
    table.check("status in ('pending', 'sent', 'failed')");
    table.text("sent_by_email").notNullable();
    table.text("recipient_email").notNullable();
    table.specificType("cc_emails", "text[]").notNullable().defaultTo("{}");
    table.text("subject").notNullable();
    table.text("html_body").notNullable();
    table.text("payload_hash").notNullable();
    table.specificType("attachment_ids", "uuid[]").notNullable().defaultTo("{}");
    table.specificType("attachment_names", "text[]").notNullable().defaultTo("{}");
    table.text("provider_message_id").nullable().unique();
  });
  await knex.raw(
    "create unique index dossier_cnpn_email_one_pending on dossier_cnpn_email_sent_event (dossier) where status = 'pending'",
  );
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("dossier_cnpn_email_sent_event");
}
