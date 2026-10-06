import { arrayBuffer } from "node:stream/consumers";
import type { Knex } from "knex";

import { parseFichierEspecesImpactees } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";

import { directDatabaseConnection } from "../../database.ts";
import { loadEspeceByCD_REF } from "../../especeProtegee.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "../../referentielTypeImpactMethodeMoyenDePoursuite.ts";
import { getFile } from "../file.ts";
import { fileKey, getObject } from "../../objectStorage.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

const MEDIA_TYPES_TABLEUR = new Set([
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type PreparedImpactFile = Partial<
  Awaited<ReturnType<typeof parseFichierEspecesImpactees>>
> & {
  anomalies: AnomalieFichierEspeces[];
};

// Read and parse before dossier writes acquire the shared access lock.
export async function prepareImpactEspeceFile(
  fileId: FileId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<PreparedImpactFile> {
  const fichier = await getFile(fileId, databaseConnection);
  if (!fichier) {
    return { anomalies: [{ message: "le fichier espèces impactées est introuvable" }] };
  }
  if (!fichier.media_type || !MEDIA_TYPES_TABLEUR.has(fichier.media_type)) {
    return {
      anomalies: [
        {
          message: `le fichier « ${fichier.name} » n’est ni un .ods ni un .xlsx : il n’a pas pu être lu`,
        },
      ],
    };
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
    return {
      anomalies: [
        {
          message: `le fichier espèces impactées n’a pas pu être importé : ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }

  return parsed;
}
