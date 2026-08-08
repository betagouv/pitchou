import type { Knex } from "knex";

import { TAXREF } from "./data/espece-taxref.ts";

export async function seed(knex: Knex) {
  await knex("espece_taxref").truncate();
  await knex.batchInsert("espece_taxref", TAXREF, 1000);

  console.log(`  Seed espece_taxref OK (${TAXREF.length} lignes)`);
}
