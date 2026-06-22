import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    `ALTER TABLE dossier ALTER COLUMN date_fin_consultation_public TYPE DATE USING date_fin_consultation_public::date`,
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    `ALTER TABLE dossier ALTER COLUMN date_fin_consultation_public TYPE TIMESTAMP USING date_fin_consultation_public::timestamp`,
  );
}
