import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("organisation", (table) => {
    table.comment(
      "Per-dossier organisation identity without a SIRET. Never merged by name or SIREN.",
    );
    table.increments("id").primary();
    table.text("name").notNullable();
    table.text("address");
    table.string("siren", 9);
    table.text("verification_status").notNullable();
    table.text("source").notNullable();
    table.text("source_reference").notNullable();
    table.text("verification_evidence");
    table.check("name ~ '[^[:space:]]'", [], "organisation_name_check");
    table.check("source ~ '[^[:space:]]'", [], "organisation_source_check");
    table.check("source_reference ~ '[^[:space:]]'", [], "organisation_source_reference_check");
    table.check("siren IS NULL OR siren ~ '^[0-9]{9}$'", [], "organisation_siren_check");
    table.check(
      `(verification_status = 'source_declared' AND siren IS NULL AND verification_evidence IS NULL)
       OR (verification_status = 'verified' AND verification_evidence IS NOT NULL
           AND verification_evidence ~ '[^[:space:]]')`,
      [],
      "organisation_verification_check",
    );
  });
  await knex.schema.alterTable("porteur_de_projet", (table) => {
    table.integer("organisation").index();
    table.foreign("organisation").references("id").inTable("organisation").onDelete("RESTRICT");
    table.dropChecks("porteur_de_projet_check");
    table.check(
      "num_nonnulls(personne_physique, personne_morale, organisation) = 1",
      [],
      "porteur_de_projet_check",
    );
  });
}

export async function down(knex: Knex) {
  // The old schema cannot represent an organisation. Refuse to discard dossier data.
  const existing = await knex("porteur_de_projet").whereNotNull("organisation").first();
  if (existing) throw new Error("Cannot roll back while porteurs reference organisations");
  await knex.schema.alterTable("porteur_de_projet", (table) => {
    table.dropChecks("porteur_de_projet_check");
    table.dropColumn("organisation");
    table.check(
      "num_nonnulls(personne_physique, personne_morale) = 1",
      [],
      "porteur_de_projet_check",
    );
  });
  await knex.schema.dropTable("organisation");
}
