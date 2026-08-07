import type { Knex } from "knex";

import { AJOUTS_CHUNK_1 } from "./espece-protegee-modification-ajouts/chunk-1.ts";
import { AJOUTS_CHUNK_2 } from "./espece-protegee-modification-ajouts/chunk-2.ts";

const AJOUTS = [...AJOUTS_CHUNK_1, ...AJOUTS_CHUNK_2];
const EXCLUDED = "100";

export async function seed(knex: Knex) {
  await knex.batchInsert("espece_protegee_modification", AJOUTS, 1000);
  await knex("espece_protegee_modification").insert({ cd_ref: EXCLUDED, excluded: true });

  console.log(`  Seed modifications ajouts OK (${AJOUTS.length} ajouts + 1 exclusion)`);
}
