import { createReadStream } from "node:fs";

import { parse } from "csv-parse";

import { directDatabaseConnection, closeDatabaseConnection } from "@pitchou/server/database.ts";

import type { BDC_STATUT_ROW } from "@pitchou/types/especes.d.ts";
import type { EspeceBdcStatutInitializer } from "@pitchou/types/database/public/EspeceBdcStatut.ts";

// Imports BDC-Statuts (INPN file) into the `espece_bdc_statut` table. Full import
// (all statut types); the PN/PR/PD/POM filtering happens when the
// `espece_protegee_reference` table is rebuilt. Run in dev and prod alike
// (`just generate-bdc`) after a source update.

process.title = `Import BDC-Statuts`;

const BDC_PATH = new URL("../../data/sources_especes/bdc_18_01.csv", import.meta.url);
const BATCH_SIZE = 5000;

async function main() {
  const db = directDatabaseConnection;
  await db("espece_bdc_statut").truncate();

  const parser = createReadStream(BDC_PATH).pipe(
    parse({ delimiter: ",", columns: true, trim: true }),
  );

  let batch: EspeceBdcStatutInitializer[] = [];
  let total = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await db.batchInsert("espece_bdc_statut", batch, 1000);
    total += batch.length;
    batch = [];
    if (total % 100000 === 0) console.info(`  ${total} lignes…`);
  };

  for await (const record of parser as AsyncIterable<BDC_STATUT_ROW>) {
    const { CD_NOM, CD_REF, CD_TYPE_STATUT, LABEL_STATUT } = record;
    batch.push({
      cd_nom: CD_NOM,
      cd_ref: CD_REF,
      cd_type_statut: CD_TYPE_STATUT,
      label_statut: LABEL_STATUT ?? "",
    });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.info(`BDC-Statuts importé : ${total} lignes dans espece_bdc_statut`);
}

main().finally(() => closeDatabaseConnection());
