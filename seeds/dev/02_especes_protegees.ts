import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { dsvFormat } from "d3-dsv";

import type { Knex } from "knex";

import { replaceEspecesProtegees } from "../../src/lib/server/especeProtegee.ts";

import type { EspèceProtégéeStrings } from "../../scripts/types/especes.d.ts";
import type {
  EspeceProtegeeInitializer,
  EspeceProtegeeCdRef,
} from "../../scripts/types/database/public/EspeceProtegee.ts";

// Versioned snapshot used only to bootstrap dev/CI. Production is refreshed from
// the INPN sources via `just import-especes-protegees`. The runtime source of
// truth is the `espece_protegee` table, not this file.
const SNAPSHOT_PATH = join(import.meta.dirname, "../data/especes-protegees.csv");

function splitListe(valeur: string | undefined): string[] {
  return valeur && valeur.length >= 1 ? valeur.split(",") : [];
}

export async function seed(knex: Knex) {
  const contenu = await readFile(SNAPSHOT_PATH, "utf8");
  const lignes: EspèceProtégéeStrings[] = dsvFormat(";").parse(contenu);

  const rows: EspeceProtegeeInitializer[] = lignes.map((ligne) => ({
    cd_ref: ligne.CD_REF as EspeceProtegeeCdRef,
    classification: ligne.classification,
    noms_scientifiques: splitListe(ligne.nomsScientifiques),
    noms_vernaculaires: splitListe(ligne.nomsVernaculaires),
    cd_type_statuts: splitListe(ligne.CD_TYPE_STATUTS),
    espece_ministerielle: ligne.espèceMinistérielle === "O",
    espece_cnpn: ligne.espèceCNPN === "O",
  }));

  await replaceEspecesProtegees(rows, knex);

  console.log(`  Seed espèces protégées OK (${rows.length} espèces)`);
}
