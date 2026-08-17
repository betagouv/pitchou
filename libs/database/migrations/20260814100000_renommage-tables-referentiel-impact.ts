import type { Knex } from "knex";

/**
 * Renames the three referential tables of ADR-0001 so that every table of the impact model shares
 * the `impact_` prefix, now that the fact table `impact_espece` joins them.
 *
 * They were created by `20260805120000`, which is already deployed, hence a rename rather than an
 * edit of that migration.
 */

const RENAMES = [
  ["type_impact", "impact_type"],
  ["methode", "impact_methode"],
  ["moyen_de_poursuite", "impact_moyen_de_poursuite"],
] as const;

async function renameTables(knex: Knex, renames: readonly (readonly [string, string])[]) {
  for (const [from, to] of renames) {
    await knex.schema.renameTable(from, to);
  }
}

export async function up(knex: Knex) {
  await renameTables(knex, RENAMES);
}

export async function down(knex: Knex) {
  await renameTables(
    knex,
    [...RENAMES].reverse().map(([from, to]) => [to, from] as const),
  );
}
