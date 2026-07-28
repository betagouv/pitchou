import type { Knex } from "knex";

// demarche_number is a Demarches Numeriques concept. Dossiers created directly
// in Pitchou (without going through DN) have no démarche, so the column must
// accept NULL. The DN sync keeps setting it explicitly at insert time.
export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.integer("demarche_number").nullable().alter();
  });
}

export async function down(knex: Knex) {
  await knex.raw(`UPDATE dossier SET demarche_number = 88444 WHERE demarche_number IS NULL`);
  await knex.schema.alterTable("dossier", (table) => {
    table.integer("demarche_number").notNullable().defaultTo(88444).alter();
  });
}
