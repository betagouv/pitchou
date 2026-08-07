import type {
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type {
  GetPersonnesEntreprisesData,
  MakeCommonDossierColumnsForSync,
} from "./makeDossiersForSynchronization/dossierSynchronizationTypes.ts";
import {
  makeChampsDossierForInitialization,
  makeDecisionAdministrativeFromTraitementDS,
  makeEvenementsPhaseDossierFromTraitementsDS,
  splitDossiersToInitializeAndToUpdate,
} from "./makeDossiersForSynchronization/makeDossierSynchronizationData.ts";

export type { GetPersonnesEntreprisesData, MakeCommonDossierColumnsForSync };
export { getPersonnesEntreprisesData88444 } from "./makeDossiersForSynchronization/getPersonnesEntreprisesData88444.ts";
export { mapPersistedAdditionalData } from "./makeDossiersForSynchronization/persistedAdditionalData.ts";

export async function makeDossiersForSynchronization(
  dossiersDS: DossierDS88444[],
  demarcheNumber: number,
  dossierNumberToDossierId: Map<Dossier["demarche_numerique_number"], Dossier["id"]>,
  downloadedFichiersMotivation: Map<number, FileId> | undefined,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
  getPersonnesEntreprisesData: GetPersonnesEntreprisesData,
  makeCommonDossierColumnsForSync: MakeCommonDossierColumnsForSync,
): Promise<{
  dossiersToInitializeForSync: DossierEntreprisesPersonneInitializersForInsert[];
  dossiersToUpdateForSync: DossierEntreprisesPersonneInitializersForUpdate[];
}> {
  const { dossiersDSToInitialize, dossiersDSToUpdate } = splitDossiersToInitializeAndToUpdate(
    dossiersDS,
    dossierNumberToDossierId,
  );
  const dossiersToInitializeForSyncP = dossiersDSToInitialize.map(async (dossierDS) => {
    const champs = await makeChampsDossierForInitialization(
      dossierDS,
      demarcheNumber,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
      makeCommonDossierColumnsForSync,
    );
    const evenements = makeEvenementsPhaseDossierFromTraitementsDS(dossierDS.traitements);
    const decision = makeDecisionAdministrativeFromTraitementDS(
      dossierDS,
      downloadedFichiersMotivation,
      null,
    );
    return {
      dossier: {
        ...champs.dossier,
        ...getPersonnesEntreprisesData(dossierDS, pitchouKeyToChampDS),
      },
      evenement_phase_dossier: champs.evenement_phase_dossier ?? evenements,
      avis_expert: champs.avis_expert || [],
      decision_administrative: [...(champs.decision_administrative || []), ...decision],
      followers: champs.followers,
    };
  });
  const dossiersToUpdateForSync = dossiersDSToUpdate.map((dossierDS) => {
    const dossierId = dossierNumberToDossierId.get(String(dossierDS.number));
    if (!dossierId) {
      throw new Error(
        `dossier.id non trouvé pour dossier DS ${dossierDS.number} qui est en base de données`,
      );
    }
    return {
      dossier: {
        ...makeCommonDossierColumnsForSync(
          dossierDS,
          pitchouKeyToChampDS,
          pitchouKeyToAnnotationDS,
        ),
        ...getPersonnesEntreprisesData(dossierDS, pitchouKeyToChampDS),
      },
      evenement_phase_dossier: makeEvenementsPhaseDossierFromTraitementsDS(
        dossierDS.traitements,
        dossierId,
      ),
      decision_administrative: makeDecisionAdministrativeFromTraitementDS(
        dossierDS,
        downloadedFichiersMotivation,
        dossierId,
      ),
    };
  });
  return {
    dossiersToInitializeForSync: await Promise.all(dossiersToInitializeForSyncP),
    dossiersToUpdateForSync,
  };
}
