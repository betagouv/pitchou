import type { Knex } from "knex";

import type { EspeceProtegeeModificationInitializer } from "../../scripts/types/database/public/EspeceProtegeeModification.ts";

const FLAGS: EspeceProtegeeModificationInitializer[] = [
  { cd_ref: "212", espece_cnpn: true },
  { cd_ref: "240", espece_ministerielle: true },
  { cd_ref: "299", espece_ministerielle: true },
  { cd_ref: "959", espece_cnpn: true },
  { cd_ref: "968", espece_cnpn: true },
  { cd_ref: "971", espece_cnpn: true },
  { cd_ref: "1009", espece_cnpn: true },
  { cd_ref: "1027", espece_cnpn: true },
  { cd_ref: "1031", espece_cnpn: true },
  { cd_ref: "2419", espece_cnpn: true },
  { cd_ref: "2473", espece_cnpn: true },
  { cd_ref: "2477", espece_ministerielle: true },
  { cd_ref: "2514", espece_cnpn: true },
  { cd_ref: "2571", espece_cnpn: true },
  { cd_ref: "2645", espece_cnpn: true },
  { cd_ref: "2657", espece_ministerielle: true },
  { cd_ref: "2660", espece_cnpn: true },
  { cd_ref: "2666", espece_ministerielle: true },
  { cd_ref: "2709", espece_cnpn: true },
  { cd_ref: "2826", espece_ministerielle: true },
  { cd_ref: "2852", espece_ministerielle: true },
  { cd_ref: "2869", espece_ministerielle: true },
  { cd_ref: "3053", espece_ministerielle: true },
  { cd_ref: "3089", espece_ministerielle: true },
  { cd_ref: "84476", espece_cnpn: true },
  { cd_ref: "103626", espece_cnpn: true },
] as unknown as EspeceProtegeeModificationInitializer[];

export async function seed(knex: Knex) {
  await knex("espece_protegee_modification").truncate();
  await knex.batchInsert("espece_protegee_modification", FLAGS, 1000);

  console.log(`  Seed modifications drapeaux OK (${FLAGS.length} espèces)`);
}
