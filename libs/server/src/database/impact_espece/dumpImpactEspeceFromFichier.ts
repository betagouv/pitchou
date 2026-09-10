import { arrayBuffer } from "node:stream/consumers";
import type { Knex } from "knex";

import { parseFichierEspecesImpactees } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";

import { directDatabaseConnection } from "../../database.ts";
import { loadEspeceByCD_REF } from "../../especeProtegee.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "../../referentielTypeImpactMethodeMoyenDePoursuite.ts";
import { getFile } from "../file.ts";
import { fileKey, getObject } from "../../objectStorage.ts";
import { fromFileToDatabaseImpactEspeceRow } from "./rows.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

const MEDIA_TYPES_TABLEUR = new Set([
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function alreadyImported(
  dossierId: Dossier["id"],
  fileId: FileId,
  databaseConnection: Knex.Transaction | Knex,
): Promise<boolean> {
  const row = await databaseConnection("impact_espece")
    .select("id")
    .where({ dossier: dossierId, source_file: fileId })
    .first();

  return Boolean(row);
}

/**
 * Reads a dossier's espèces impactées file and replaces its `impact_espece` rows with what it says.
 */
export async function dumpImpactEspeceFromFichier(
  dossierId: Dossier["id"],
  fileId: FileId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AnomalieFichierEspeces[]> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      dumpImpactEspeceFromFichier(dossierId, fileId, trx),
    );
  await databaseConnection("dossier").select("id").where({ id: dossierId }).forUpdate();
  if (await alreadyImported(dossierId, fileId, databaseConnection)) return [];

  const fichier = await getFile(fileId, databaseConnection);
  if (!fichier) {
    return [{ message: "le fichier espèces impactées est introuvable" }];
  }
  if (!fichier.media_type || !MEDIA_TYPES_TABLEUR.has(fichier.media_type)) {
    return [
      {
        message: `le fichier « ${fichier.name} » n’est ni un .ods ni un .xlsx : il n’a pas pu être lu`,
      },
    ];
  }

  // Database failures must abort the transaction, not become file anomalies.
  const [especeByCD_REF, referentiel] = await Promise.all([
    loadEspeceByCD_REF(databaseConnection),
    getReferentielTypeImpactMethodeMoyenDePoursuite(databaseConnection),
  ]);

  let parsed: Awaited<ReturnType<typeof parseFichierEspecesImpactees>>;
  try {
    const contenu = await arrayBuffer((await getObject(fileKey(fileId))).body);
    parsed = await parseFichierEspecesImpactees(contenu, especeByCD_REF, referentiel);
  } catch (error) {
    return [
      {
        message: `le fichier espèces impactées n’a pas pu être importé : ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
    ];
  }

  // Replace rather than merge: the file describes the dossier's impacts in full.
  const rows = fromFileToDatabaseImpactEspeceRow(parsed.impactEspece, dossierId, fileId);
  await databaseConnection("impact_espece").where({ dossier: dossierId }).delete();
  if (rows.length) await databaseConnection("impact_espece").insert(rows);
  return parsed.anomalies;
}
