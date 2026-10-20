import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";
import { synchronizeDossierRelations } from "../synchronizeDossierRelations.ts";
import {
  type startDossierFileDownloads,
  synchronizeDownloadedDossierFiles,
} from "../synchronizeDossierFiles.ts";
import type { SynchronizationOptions } from "./preparation.ts";

export async function markInitialDossierActions(
  existingDossiers: { id: DossierId }[],
  dossierIdByDNNumber: Map<number, DossierId>,
  transaction: Knex.Transaction,
) {
  // Initial files and identities are the submission baseline, not applicant edits.
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
  fileDownloads: ReturnType<typeof startDossierFileDownloads>,
  groupesInstructeursP: Promise<unknown>,
  {
    demarcheNumber,
    pitchouKeyToChampDS,
    transaction,
  }: Pick<SynchronizationOptions, "demarcheNumber" | "pitchouKeyToChampDS" | "transaction">,
) {
  const { dossierIdByDNNumber, identitesSynchronization, synchronizations } =
    await synchronizeDossierRelations(dossiersDS, dossiersForSync, demarcheNumber, transaction);
  const [especesImpacteesP, piecesJointesP] = synchronizeDownloadedDossierFiles(
    fileDownloads,
    dossiersDS,
    dossierIdByDNNumber,
    pitchouKeyToChampDS,
    transaction,
  );
  const [dossiersChangedByEspeces, dossiersChangedByPiecesJointes, dossiersChangedByIdentites] =
    await Promise.all([
      especesImpacteesP,
      piecesJointesP,
      identitesSynchronization,
      groupesInstructeursP,
      ...synchronizations,
    ]);

  return {
    dossierIdByDNNumber,
    dossiersChangedByEspeces,
    dossiersChangedByPiecesJointes,
    dossiersChangedByIdentites,
  };
}
