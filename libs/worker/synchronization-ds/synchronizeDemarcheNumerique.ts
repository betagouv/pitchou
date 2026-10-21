import { dumpDossiers, deleteDossierByDSNumber } from "@pitchou/server/database/dossier.ts";
import getAllDeletedDossiers from "@pitchou/server/demarche-numerique/getAllDeletedDossiers.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { startDossierFileDownloads, prepareDossierFiles } from "./synchronizeDossierFiles.ts";
import { updateNotification } from "./synchronization-notification.ts";
import {
  prepareSynchronization,
  type SynchronizationOptions,
} from "./synchronizeDemarcheNumerique/preparation.ts";
import {
  markInitialDossierActions,
  synchronizeRelationsAndFiles,
} from "./synchronizeDemarcheNumerique/relations.ts";

export async function synchronizeDemarcheNumerique(options: SynchronizationOptions): Promise<void> {
  const { apiToken, demarcheNumber, pitchouKeyToChampDS, transaction } = options;
  const deletedDossiersP = getAllDeletedDossiers(apiToken, demarcheNumber);
  const {
    dossiersDS,
    existingDossiers,
    dossiersForSync,
    dossiersToInitialize,
    dossiersToUpdate,
    dossiersChangedByEntreprises,
  } = await prepareSynchronization(options);
  const fileDownloads = startDossierFileDownloads(
    dossiersDS,
    demarcheNumber,
    pitchouKeyToChampDS,
    transaction,
  );

  // Finish DN and object-storage reads before dossier ownership takes the access lock.
  const files = await prepareDossierFiles(fileDownloads, transaction);
  const deleted = await deletedDossiersP;
  const dossierPersistence =
    dossiersToInitialize.length > 0 || dossiersToUpdate.length > 0
      ? dumpDossiers(dossiersToInitialize, dossiersToUpdate, transaction)
      : undefined;
  const deletedDossiers = deleteDossierByDSNumber(
    deleted.map(({ number }) => number),
    transaction,
  );
  const [dossiersChangedByColumns] = await Promise.all([dossierPersistence, deletedDossiers]);

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
