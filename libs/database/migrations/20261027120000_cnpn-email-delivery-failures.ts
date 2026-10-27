import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("email_issue_notification", (table) => {
    table.text("id").primary();
    table.jsonb("issue").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("claimed_at", { useTz: true }).nullable();
    table.timestamp("sent_at", { useTz: true }).nullable();
    table.timestamp("first_attempt_at", { useTz: true }).nullable();
    table.timestamp("uncertain_at", { useTz: true }).nullable();
  });
  await knex.schema.alterTable("dossier_cnpn_email_sent_event", (table) => {
    table.timestamp("delivery_failed_at", { useTz: true }).nullable();
    table.text("delivery_failure_event").nullable();
    table.text("delivery_failure_reason").nullable();
    table.timestamp("failure_notification_claimed_at", { useTz: true }).nullable();
    table.timestamp("failure_notification_sent_at", { useTz: true }).nullable();
    table.timestamp("failure_notification_first_attempt_at", { useTz: true }).nullable();
    table.timestamp("failure_notification_uncertain_at", { useTz: true }).nullable();
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("email_issue_notification");
  await knex.schema.alterTable("dossier_cnpn_email_sent_event", (table) => {
    table.dropColumns(
      "delivery_failed_at",
      "delivery_failure_event",
      "delivery_failure_reason",
      "failure_notification_claimed_at",
      "failure_notification_sent_at",
      "failure_notification_first_attempt_at",
      "failure_notification_uncertain_at",
    );
  });
}
