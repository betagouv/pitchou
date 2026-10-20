import {
  getActiviteReferentiel,
  registerActiviteLabels,
} from "@pitchou/server/database/activite.ts";
import { getDossierIdsFromDS_Ids } from "@pitchou/server/database/dossier.ts";
import { getRecentlyUpdatedDossiers } from "@pitchou/server/demarche-numerique/getRecentlyUpdatedDossiers.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { Knex } from "knex";
import { downloadNewFichiersMotivation } from "../downloadNewFichiersByType.ts";
import {
  getPersonnesEntreprisesData88444,
  makeDossiersForSynchronization,
  type GetPersonnesEntreprisesData,
  type MakeCommonDossierColumnsForSync,
} from "../makeDossiersForSynchronization.ts";
import { makeCommonDossierColumnsForSync88444 } from "../makeCommonDossierColumnsForSync88444.ts";
import { prepareDossiersForPersistence } from "../prepareDossiersForPersistence.ts";

export type SynchronizationOptions = {
  apiToken: string;
  demarcheNumber: number;
  lastModified: Date;
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>;
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>;
  transaction: Knex.Transaction;
};

export async function prepareSynchronization({
  apiToken,
  demarcheNumber,
  lastModified,
  pitchouKeyToChampDS,
  pitchouKeyToAnnotationDS,
  transaction,
}: SynchronizationOptions) {
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
    await mapDossiersForSynchronization(
      dossiersDS,
      demarcheNumber,
      dossierNumberToDossierId,
      motivations,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
      transaction,
    );
  const dossiersForSync = [...dossiersToInitializeForSync, ...dossiersToUpdateForSync];
  const activiteLabels = new Set(
    dossiersForSync
      .map(({ dossier }) => dossier.main_activite)
      .filter((label): label is string => !!label),
  );
  await registerActiviteLabels([...activiteLabels], transaction);
  const { dossiersToInitialize, dossiersToUpdate, dossiersChangedByEntreprises } =
    await prepareDossiersForPersistence(
      dossiersToInitializeForSync,
      dossiersToUpdateForSync,
      transaction,
    );
  return {
    dossiersDS,
    existingDossiers,
    dossiersForSync,
    dossiersToInitialize,
    dossiersToUpdate,
    dossiersChangedByEntreprises,
  };
}

async function mapDossiersForSynchronization(
  dossiersDS: DossierDS88444[],
  demarcheNumber: number,
  dossierNumberToDossierId: Map<string, DossierId>,
  motivations: Awaited<ReturnType<typeof downloadNewFichiersMotivation>>,
  pitchouKeyToChampDS: SynchronizationOptions["pitchouKeyToChampDS"],
  pitchouKeyToAnnotationDS: SynchronizationOptions["pitchouKeyToAnnotationDS"],
  transaction: Knex.Transaction,
) {
  // Business rules in the column mapping compare activity codes; labels first seen in this
  // batch are not in the map yet and resolve to "autre" until an admin groups them.
  const { labels: activiteLabelRows } = await getActiviteReferentiel(transaction);
  const activiteCodeByLabel = new Map(
    activiteLabelRows.map(({ label, activite_code }) => [label, activite_code]),
  );
  const makeDossierColumns = (
    dossierDS: DossierDS88444,
    keyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  ) => makeCommonDossierColumnsForSync88444(dossierDS, keyToChampDS, activiteCodeByLabel);
  const { dossiersToInitializeForSync, dossiersToUpdateForSync } =
    await makeDossiersForSynchronization(
      dossiersDS,
      demarcheNumber,
      dossierNumberToDossierId,
      motivations,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
      getPersonnesEntreprisesData88444 as unknown as GetPersonnesEntreprisesData,
      makeDossierColumns as unknown as MakeCommonDossierColumnsForSync,
    );
  return { dossiersToInitializeForSync, dossiersToUpdateForSync };
}
