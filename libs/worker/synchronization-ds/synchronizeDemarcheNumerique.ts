import { registerActiviteLabels } from "@pitchou/server/database/activite.ts";
import {
  dumpDossiers,
  deleteDossierByDSNumber,
  getDossierIdsFromDS_Ids,
} from "@pitchou/server/database/dossier.ts";
import { synchronizeGroupesInstructeurs } from "@pitchou/server/database/groupe_instructeurs.ts";
import getAllDeletedDossiers from "@pitchou/server/demarche-numerique/getAllDeletedDossiers.ts";
import { getGroupesInstructeurs } from "@pitchou/server/demarche-numerique/getGroupesInstructeurs.ts";
import { getRecentlyUpdatedDossiers } from "@pitchou/server/demarche-numerique/getRecentlyUpdatedDossiers.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { Knex } from "knex";
import { downloadNewFichiersMotivation } from "./downloadNewFichiersByType.ts";
import {
  getPersonnesEntreprisesData88444,
  makeDossiersForSynchronization,
} from "./makeDossiersForSynchronization.ts";
import type {
  GetPersonnesEntreprisesData,
  MakeCommonDossierColumnsForSync,
} from "./makeDossiersForSynchronization.ts";
import { makeCommonDossierColumnsForSync88444 } from "./makeCommonDossierColumnsForSync88444.ts";
import { prepareDossiersForPersistence } from "./prepareDossiersForPersistence.ts";
import {
  startDossierFileDownloads,
  synchronizeDownloadedDossierFiles,
} from "./synchronizeDossierFiles.ts";
import { synchronizeDossierRelations } from "./synchronizeDossierRelations.ts";

type SynchronizationOptions = {
  apiToken: string;
  demarcheNumber: number;
  lastModified: Date;
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>;
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>;
  transaction: Knex.Transaction;
};

export async function synchronizeDemarcheNumerique({
  apiToken,
  demarcheNumber,
  lastModified,
  pitchouKeyToChampDS,
  pitchouKeyToAnnotationDS,
  transaction,
}: SynchronizationOptions): Promise<void> {
  const deletedDossiersP = getAllDeletedDossiers(apiToken, demarcheNumber);
  const groupesInstructeursP = getGroupesInstructeurs(apiToken, demarcheNumber).then((groupes) =>
    synchronizeGroupesInstructeurs(groupes, demarcheNumber, transaction),
  );
  const dossiersDS: DossierDS88444[] = await getRecentlyUpdatedDossiers(
    apiToken,
    demarcheNumber,
    lastModified,
  );
  console.info("Nombre de dossiers", dossiersDS.length);

  const existingDossiers = await getDossierIdsFromDS_Ids(
    dossiersDS.map(({ id }) => id),
    transaction,
  );
  const dossierNumberToDossierId = new Map(
    existingDossiers.map(({ demarche_numerique_number, id }) => [demarche_numerique_number, id]),
  );
  const motivations = await downloadNewFichiersMotivation(dossiersDS, transaction);
  if (demarcheNumber !== 88444) {
    throw new Error(
      `Les fonctions nécessaires pour asssocier les questions du formulaire de la démarche aux données Pitchou n'ont pas été trouvées pour la Démarche numéro ${demarcheNumber}.`,
    );
  }
  const { dossiersToInitializeForSync, dossiersToUpdateForSync } =
    await makeDossiersForSynchronization(
      dossiersDS,
      demarcheNumber,
      dossierNumberToDossierId,
      motivations,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
      getPersonnesEntreprisesData88444 as unknown as GetPersonnesEntreprisesData,
      makeCommonDossierColumnsForSync88444 as unknown as MakeCommonDossierColumnsForSync,
    );
  const dossiersForSync = [...dossiersToInitializeForSync, ...dossiersToUpdateForSync];
  const activiteLabels = new Set(
    dossiersForSync
      .map(({ dossier }) => dossier.main_activite)
      .filter((label): label is string => !!label),
  );
  await registerActiviteLabels([...activiteLabels], transaction);
  const { dossiersToInitialize, dossiersToUpdate } = await prepareDossiersForPersistence(
    dossiersToInitializeForSync,
    dossiersToUpdateForSync,
    transaction,
  );
  const fileDownloads = startDossierFileDownloads(
    dossiersDS,
    demarcheNumber,
    pitchouKeyToChampDS,
    transaction,
  );

  const dossierPersistence =
    dossiersToInitialize.length >= 1 || dossiersToUpdate.length >= 1
      ? dumpDossiers(dossiersToInitialize, dossiersToUpdate, transaction)
      : undefined;
  const deletedDossiers = deletedDossiersP.then((deleted) =>
    deleteDossierByDSNumber(deleted.map(({ number }) => number)),
  );
  await Promise.all([dossierPersistence, deletedDossiers]);

  const { dossierIdByDNNumber, synchronizations } = await synchronizeDossierRelations(
    dossiersDS,
    dossiersForSync,
    demarcheNumber,
    transaction,
  );
  const fileSynchronizations = synchronizeDownloadedDossierFiles(
    fileDownloads,
    dossiersDS,
    dossierIdByDNNumber,
    pitchouKeyToChampDS,
    transaction,
  );
  await Promise.all([groupesInstructeursP, ...synchronizations, ...fileSynchronizations]);
}
