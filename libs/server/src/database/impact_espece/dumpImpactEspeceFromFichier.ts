import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { fromFileToDatabaseImpactEspeceRow } from "./rows.ts";
import { prepareImpactEspeceFile, type PreparedImpactFile } from "./prepareImpactEspeceFile.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

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
  preparedFile?: PreparedImpactFile | null,
): Promise<AnomalieFichierEspeces[]> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      dumpImpactEspeceFromFichier(dossierId, fileId, trx, preparedFile),
    );
  await databaseConnection("dossier").select("id").where({ id: dossierId }).forUpdate();
  if (await alreadyImported(dossierId, fileId, databaseConnection)) return [];
  // A skipped import may have been removed since preparation. Retry the sync instead
  // of reading storage while dossier ownership holds the shared access lock.
  if (preparedFile === null)
    throw new Error("Species import changed during synchronization; retry the synchronization");

  const parsed = preparedFile ?? (await prepareImpactEspeceFile(fileId, databaseConnection));
  if (!parsed.impactEspece) return parsed.anomalies;

  // Replace rather than merge: the file describes the dossier's impacts in full.
  const rows = fromFileToDatabaseImpactEspeceRow(parsed.impactEspece, dossierId, fileId);
  await databaseConnection("impact_espece").where({ dossier: dossierId }).delete();
  if (rows.length) await databaseConnection("impact_espece").insert(rows);
  return parsed.anomalies;
}
