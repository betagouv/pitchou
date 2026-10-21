import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";
import { synchronizeDossierRelations } from "../synchronizeDossierRelations.ts";
import {
  type prepareDossierFiles,
  synchronizeDownloadedDossierFiles,
} from "../synchronizeDossierFiles.ts";
import type { SynchronizationOptions } from "./preparation.ts";

export async function markInitialDossierActions(
  existingDossiers: { id: DossierId }[],
  dossierIdByDNNumber: Map<number, DossierId>,
  transaction: Knex.Transaction,
) {
  // Initial files and acteurs are the submission baseline, not applicant edits.
  // Keep the records, but exclude them from review and the modification history.
  const existingIds = new Set(existingDossiers.map(({ id }) => id));
  const initialIds = [...dossierIdByDNNumber.values()].filter((id) => !existingIds.has(id));
  if (initialIds.length > 0) {
    await transaction("action_dossier")
      .whereIn("dossier", initialIds)
      .where("author_petitionnaire", true)
      .whereRaw("data->>'notification' = 'true'")
      .update({ data: transaction.raw("(data - 'notification') || '{\"baseline\":true}'::jsonb") });
  }
}

export async function synchronizeRelationsAndFiles(
  dossiersDS: DossierDS88444[],
  dossiersForSync: Parameters<typeof synchronizeDossierRelations>[1],
  files: Awaited<ReturnType<typeof prepareDossierFiles>>,
  {
    demarcheNumber,
    pitchouKeyToChampDS,
    transaction,
  }: Pick<SynchronizationOptions, "demarcheNumber" | "pitchouKeyToChampDS" | "transaction">,
) {
  const { dossierIdByDNNumber, acteursSynchronization, synchronizations } =
    await synchronizeDossierRelations(dossiersDS, dossiersForSync, demarcheNumber, transaction);
  const [especesImpacteesP, piecesJointesP] = synchronizeDownloadedDossierFiles(
    files,
    dossiersDS,
    dossierIdByDNNumber,
    pitchouKeyToChampDS,
    transaction,
  );
  const [dossiersChangedByEspeces, dossiersChangedByPiecesJointes, dossiersChangedByActeurs] =
    await Promise.all([
      especesImpacteesP,
      piecesJointesP,
      acteursSynchronization,
      ...synchronizations,
    ]);

  return {
    dossierIdByDNNumber,
    dossiersChangedByEspeces,
    dossiersChangedByPiecesJointes,
    dossiersChangedByActeurs,
  };
}
