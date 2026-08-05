import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("dossier", (table) => {
    table
      .string("urgent_contact_phone")
      .comment("Phone number to use when the dossier requires an urgent response");
    table
      .text("request_context")
      .comment("Applicant's situation when starting the derogation request");
    table
      .text("accompaniment_need")
      .comment("Details supplied when the applicant requests upstream support");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumns("urgent_contact_phone", "request_context", "accompaniment_need");
  });
}
