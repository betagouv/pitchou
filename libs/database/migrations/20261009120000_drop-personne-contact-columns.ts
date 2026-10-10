import type { Knex } from "knex";

/**
 * The address, phone and role of a porteur de projet now live in personne_physique
 * (see ADR-0002). On personne, these columns are no longer read: personne keeps the
 * identity of the accounts only.
 */
export async function up(knex: Knex) {
  return knex.schema.alterTable("personne", (table) => {
    table.dropColumn("address");
    table.dropColumn("phone");
    table.dropColumn("role");
  });
}

// The columns come back empty: their values are not restored.
export async function down(knex: Knex) {
  return knex.schema.alterTable("personne", (table) => {
    table.string("address");
    table.string("phone");
    table.string("role");
  });
}
