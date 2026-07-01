import type { Knex } from "knex";

/**
 * Add the "Porteur de projet" information synced from Démarche Numérique:
 * - address / phone / role of the physical person (and of the representative of a legal entity)
 * - the representative (person in charge of the project within the legal entity)
 * - the detailed company (legal entity) information displayed in Démarche Numérique
 *   (legal form, NAF, headcount, share capital, detailed address…)
 *
 * The "chiffre d'affaires" (turnover) shown in Démarche Numérique is not exposed by its
 * GraphQL API, so it is not synced here.
 */
export async function up(knex: Knex) {
  await knex.schema.alterTable("personne", (table) => {
    table.string("address");
    table.string("phone");
    table.string("role");
  });

  await knex.schema.alterTable("dossier", (table) => {
    table.integer("representative").unsigned().index();
    table.foreign("representative").references("id").inTable("personne");
  });

  return knex.schema.alterTable("entreprise", (table) => {
    table.string("siren", 9);
    table.string("legal_form");
    table.string("naf_code");
    table.string("naf_label");
    // ISO date string ("YYYY-MM-DD") as provided by Démarche Numérique.
    table.string("creation_date");
    table.string("admin_status");
    table.string("headcount");
    table.bigInteger("share_capital");
    table.string("insee_code");
    table.string("postal_code");
    table.string("department");
    table.string("region");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("personne", (table) => {
    table.dropColumn("address");
    table.dropColumn("phone");
    table.dropColumn("role");
  });

  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("representative");
  });

  return knex.schema.alterTable("entreprise", (table) => {
    table.dropColumn("siren");
    table.dropColumn("legal_form");
    table.dropColumn("naf_code");
    table.dropColumn("naf_label");
    table.dropColumn("creation_date");
    table.dropColumn("admin_status");
    table.dropColumn("headcount");
    table.dropColumn("share_capital");
    table.dropColumn("insee_code");
    table.dropColumn("postal_code");
    table.dropColumn("department");
    table.dropColumn("region");
  });
}
