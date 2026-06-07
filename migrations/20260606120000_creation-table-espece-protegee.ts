import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("espece_protegee", function (table) {
    // one row per CD_REF (already aggregated in the data)
    table.text("cd_ref").primary();
    // 'oiseau' | 'faune non-oiseau' | 'flore'
    table.text("classification").notNullable();
    table.specificType("noms_scientifiques", "text[]").notNullable().defaultTo("{}");
    table.specificType("noms_vernaculaires", "text[]").notNullable().defaultTo("{}");
    // 'PN' | 'PR' | 'PD' | 'POM' | 'Protection Pitchou'
    table.specificType("cd_type_statuts", "text[]").notNullable().defaultTo("{}");
    table.boolean("espece_ministerielle").notNullable().defaultTo(false);
    table.boolean("espece_cnpn").notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("espece_protegee");
}
