import type { Knex } from "knex";

import { AJOUTS } from "./data/espece-protegee-modification-ajouts.ts";

const EXCLUDED = "100";

export async function seed(knex: Knex) {
  await knex.batchInsert("espece_protegee_modification", AJOUTS, 1000);
  await knex("espece_protegee_modification").insert({ cd_ref: EXCLUDED, excluded: true });

  console.log(`  Seed modifications ajouts OK (${AJOUTS.length} ajouts + 1 exclusion)`);
}
