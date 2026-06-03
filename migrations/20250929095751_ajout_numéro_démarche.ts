import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("groupe_instructeurs", (table) => {
    table.integer("numéro_démarche").notNullable().defaultTo(88444);
    table.integer("numéro_démarche").alter().notNullable();
  });

  await knex.schema.alterTable("dossier", (table) => {
    table.integer("numéro_démarche").notNullable().defaultTo(88444);
    table.integer("numéro_démarche").alter().notNullable();
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("groupe_instructeurs", (table) => {
    table.dropColumn("numéro_démarche");
  });

  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("numéro_démarche");
  });
}
