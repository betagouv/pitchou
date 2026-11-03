import { deleteDossierByDSNumber, dumpDossiers } from "@pitchou/server/database/dossier.ts";
import getAllDeletedDossiers from "@pitchou/server/demarche-numerique/getAllDeletedDossiers.ts";
import { withDeferredActionNotifications } from "@pitchou/server/dossierNotificationEmails/actions.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { updateNotification } from "./synchronization-notification.ts";
import {
  persistSynchronizationPreparation,
  prepareSynchronization,
  type SynchronizationOptions,
} from "./synchronizeDemarcheNumerique/preparation.ts";
import {
  markInitialDossierActions,
  synchronizeRelationsAndFiles,
} from "./synchronizeDemarcheNumerique/relations.ts";
import { prepareDossierFiles, startDossierFileDownloads } from "./synchronizeDossierFiles.ts";

export async function synchronizeDemarcheNumerique(options: SynchronizationOptions): Promise<void> {
  return withDeferredActionNotifications(options.transaction, () =>
    persistSynchronization(options),
  );
}

async function persistSynchronization(options: SynchronizationOptions): Promise<void> {
  const { apiToken, demarcheNumber, pitchouKeyToChampDS, transaction } = options;
  const deletedDossiersP = getAllDeletedDossiers(apiToken, demarcheNumber);
  const prepared = await prepareSynchronization(options);
  const { dossiersDS, existingDossiers, dossiersForSync } = prepared;
  const fileDownloads = await startDossierFileDownloads(
    dossiersDS,
    demarcheNumber,
    pitchouKeyToChampDS,
    transaction,
  );

  // Finish DN and object-storage reads before taking the access lock for database writes.
  const files = await prepareDossierFiles(fileDownloads, transaction);
  const deleted = await deletedDossiersP;
  const { dossiersToInitialize, dossiersToUpdate, dossiersChangedByEntreprises } =
    await persistSynchronizationPreparation(prepared, transaction);
  const dossiersChangedByColumns =
    dossiersToInitialize.length > 0 || dossiersToUpdate.length > 0
      ? await dumpDossiers(dossiersToInitialize, dossiersToUpdate, transaction)
      : undefined;
  await deleteDossierByDSNumber(
    deleted.map(({ number }) => number),
    transaction,
  );

  const {
    dossierIdByDNNumber,
    dossiersChangedByEspeces,
    dossiersChangedByPiecesJointes,
    dossiersChangedByActeurs,
  } = await synchronizeRelationsAndFiles(dossiersDS, dossiersForSync, files, {
    demarcheNumber,
    pitchouKeyToChampDS,
    transaction,
  });

  await markInitialDossierActions(existingDossiers, dossierIdByDNNumber, transaction);

  // Only the dossiers this synchronization found actually modified are marked
  // unread; what changed in each of them is in its historique.
  await updateNotification(
    dossiersDS,
    dossierIdByDNNumber,
    new Set<DossierId>([
      ...dossiersChangedByEntreprises,
      ...(dossiersChangedByColumns ?? []),
      ...(dossiersChangedByEspeces ?? []),
      ...(dossiersChangedByPiecesJointes ?? []),
      ...(dossiersChangedByActeurs ?? []),
    ]),
    transaction,
  );
}
