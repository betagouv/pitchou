import type { Knex } from "knex";

import { TAXREF_CHUNK_01 } from "./espece-taxref/taxref-01.ts";
import { TAXREF_CHUNK_02 } from "./espece-taxref/taxref-02.ts";
import { TAXREF_CHUNK_03 } from "./espece-taxref/taxref-03.ts";
import { TAXREF_CHUNK_04 } from "./espece-taxref/taxref-04.ts";
import { TAXREF_CHUNK_05 } from "./espece-taxref/taxref-05.ts";
import { TAXREF_CHUNK_06 } from "./espece-taxref/taxref-06.ts";
import { TAXREF_CHUNK_07 } from "./espece-taxref/taxref-07.ts";
import { TAXREF_CHUNK_08 } from "./espece-taxref/taxref-08.ts";
import { TAXREF_CHUNK_09 } from "./espece-taxref/taxref-09.ts";
import { TAXREF_CHUNK_10 } from "./espece-taxref/taxref-10.ts";
import { TAXREF_CHUNK_11 } from "./espece-taxref/taxref-11.ts";
import { TAXREF_CHUNK_12 } from "./espece-taxref/taxref-12.ts";
import { TAXREF_CHUNK_13 } from "./espece-taxref/taxref-13.ts";
import { TAXREF_CHUNK_14 } from "./espece-taxref/taxref-14.ts";
import { TAXREF_CHUNK_15 } from "./espece-taxref/taxref-15.ts";
import { TAXREF_CHUNK_16 } from "./espece-taxref/taxref-16.ts";
import { TAXREF_CHUNK_17 } from "./espece-taxref/taxref-17.ts";
import { TAXREF_CHUNK_18 } from "./espece-taxref/taxref-18.ts";
import { TAXREF_CHUNK_19 } from "./espece-taxref/taxref-19.ts";
import { TAXREF_CHUNK_20 } from "./espece-taxref/taxref-20.ts";
import { TAXREF_CHUNK_21 } from "./espece-taxref/taxref-21.ts";
import { TAXREF_CHUNK_22 } from "./espece-taxref/taxref-22.ts";
import { TAXREF_CHUNK_23 } from "./espece-taxref/taxref-23.ts";
import { TAXREF_CHUNK_24 } from "./espece-taxref/taxref-24.ts";

const TAXREF = [
  ...TAXREF_CHUNK_01,
  ...TAXREF_CHUNK_02,
  ...TAXREF_CHUNK_03,
  ...TAXREF_CHUNK_04,
  ...TAXREF_CHUNK_05,
  ...TAXREF_CHUNK_06,
  ...TAXREF_CHUNK_07,
  ...TAXREF_CHUNK_08,
  ...TAXREF_CHUNK_09,
  ...TAXREF_CHUNK_10,
  ...TAXREF_CHUNK_11,
  ...TAXREF_CHUNK_12,
  ...TAXREF_CHUNK_13,
  ...TAXREF_CHUNK_14,
  ...TAXREF_CHUNK_15,
  ...TAXREF_CHUNK_16,
  ...TAXREF_CHUNK_17,
  ...TAXREF_CHUNK_18,
  ...TAXREF_CHUNK_19,
  ...TAXREF_CHUNK_20,
  ...TAXREF_CHUNK_21,
  ...TAXREF_CHUNK_22,
  ...TAXREF_CHUNK_23,
  ...TAXREF_CHUNK_24,
];

export async function seed(knex: Knex) {
  await knex("espece_taxref").truncate();
  await knex.batchInsert("espece_taxref", TAXREF, 1000);

  console.log(`  Seed espece_taxref OK (${TAXREF.length} lignes)`);
}
