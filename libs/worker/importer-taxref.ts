import { createReadStream } from "node:fs";

import { parse } from "csv-parse";

import { directDatabaseConnection, closeDatabaseConnection } from "@pitchou/server/database.ts";

import type { TAXREF_ROW } from "@pitchou/types/especes.d.ts";
import type { EspeceTaxrefInitializer } from "@pitchou/types/database/public/EspeceTaxref.ts";

// Imports TAXREF (INPN file) into the `espece_taxref` table. Run after a source
// update, in dev and prod alike (`just generate-taxref`). The table feeds the
// `espece_protegee_reference` table (rebuilt afterwards by
// `just generate-especes-protegees`) and the admin autofill.

process.title = `Import TAXREF`;

const TAXREF_PATH = "data/sources_especes/TAXREFv18.txt";
const BATCH_SIZE = 5000;

async function main() {
  const db = directDatabaseConnection;
  await db("espece_taxref").truncate();

  const parser = createReadStream(TAXREF_PATH).pipe(
    parse({ delimiter: "\t", columns: true, trim: true }),
  );

  let batch: EspeceTaxrefInitializer[] = [];
  let total = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await db.batchInsert("espece_taxref", batch, 1000);
    total += batch.length;
    batch = [];
    if (total % 100000 === 0) console.info(`  ${total} lignes…`);
  };

  for await (const record of parser as AsyncIterable<TAXREF_ROW>) {
    const { CD_NOM, CD_REF, LB_NOM, NOM_VERN, REGNE, CLASSE } = record;
    batch.push({
      cd_nom: CD_NOM,
      cd_ref: CD_REF,
      lb_nom: LB_NOM ?? "",
      nom_vern: NOM_VERN ?? "",
      regne: REGNE ?? "",
      classe: CLASSE ?? "",
    });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.info(`TAXREF importé : ${total} lignes dans espece_taxref`);
}

main().finally(() => closeDatabaseConnection());
