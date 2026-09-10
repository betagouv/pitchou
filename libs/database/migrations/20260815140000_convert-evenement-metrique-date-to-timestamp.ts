import type { Knex } from "knex";

/**
 * The metric events only kept the day, which is too coarse to tell in which order
 * a session's actions happened. Existing rows land at midnight: their time of day
 * was never recorded and cannot be recovered.
 */
export async function up(knex: Knex) {
  await knex.raw(`
    ALTER TABLE evenement_metrique
      ALTER COLUMN date TYPE timestamptz USING date::timestamptz,
      ALTER COLUMN date SET DEFAULT now()
  `);
  await knex.raw(`COMMENT ON COLUMN evenement_metrique.date IS 'Date and time of the evenement'`);
}

export async function down(knex: Knex) {
  await knex.raw(`
    ALTER TABLE evenement_metrique
      ALTER COLUMN date TYPE date USING date::date,
      ALTER COLUMN date SET DEFAULT now()
  `);
}
