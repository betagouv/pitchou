import assert from "node:assert/strict";

import { isAfter } from "date-fns";
import { decryptDossiersAdditionalData } from "@pitchou/server/demarche-numerique/encryptDecryptDossiersAdditionalData.ts";
import type { DossierPhase, TypeDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";
import type {
  AdditionalDataForDossierCreation,
  DossierForInsert,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierDS88444, Traitement } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { MakeCommonDossierColumnsForSync } from "./dossierSynchronizationTypes.ts";
import { mapPersistedAdditionalData } from "./persistedAdditionalData.ts";

export function splitDossiersToInitializeAndToUpdate(
  dossiersDS: DossierDS88444[],
  dossierNumberToDossierId: Map<Dossier["demarche_numerique_number"], Dossier["id"]>,
) {
  const dossiersDSToInitialize: DossierDS88444[] = [];
  const dossiersDSToUpdate: DossierDS88444[] = [];
  for (const dossier of dossiersDS) {
    (dossierNumberToDossierId.has(String(dossier.number))
      ? dossiersDSToUpdate
      : dossiersDSToInitialize
    ).push(dossier);
  }
  assert.equal(dossiersDSToUpdate.length + dossiersDSToInitialize.length, dossiersDS.length);
  return { dossiersDSToInitialize, dossiersDSToUpdate };
}

export async function makeChampsDossierForInitialization(
  dossierDS: DossierDS88444,
  demarcheNumber: number,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
  makeCommonDossierColumnsForSync: MakeCommonDossierColumnsForSync,
): Promise<Partial<DossierForInsert> & Pick<DossierForInsert, "dossier">> {
  const encryptedData = dossierDS.champs.find(
    ({ label }) => label === "NE PAS MODIFIER - Données techniques associées à votre dossier",
  )?.stringValue;
  let additionalData: Partial<DossierForInsert> | undefined;
  try {
    additionalData = encryptedData
      ? mapPersistedAdditionalData(
          JSON.parse(
            await decryptDossiersAdditionalData(encryptedData),
          ) as AdditionalDataForDossierCreation,
        )
      : undefined;
    if (additionalData) {
      console.log(
        `Il y a des données supplémentaires dans le dossier DN`,
        dossierDS.number,
        additionalData,
      );
    }
  } catch (error) {
    console.warn(
      `Une erreur est survenue pendant le déchiffrage des données supplémentaires: ${error}`,
    );
  }
  return {
    dossier: {
      ...makeCommonDossierColumnsForSync(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS),
      ...(additionalData?.dossier || {}),
      depot_date: additionalData?.dossier?.depot_date ?? dossierDS.dateDepot,
      demarche_number: demarcheNumber,
      source: "demarche_numerique",
    },
    evenement_phase_dossier: additionalData?.evenement_phase_dossier,
    avis_expert: additionalData?.avis_expert,
    decision_administrative: additionalData?.decision_administrative,
    followers: additionalData?.followers,
  };
}

function traitementPhaseToDossierPhase(state: Traitement["state"]): DossierPhase {
  if (state === "en_construction") return "Accompagnement amont";
  if (state === "en_instruction") return "Instruction";
  if (state === "accepte") return "Contrôle";
  if (state === "sans_suite") return "Classé sans suite";
  if (state === "refuse") return "Obligations terminées";
  throw `Traitement phase non reconnue: ${state}`;
}

export function makeEvenementsPhaseDossierFromTraitementsDS(
  traitements: DossierDS88444["traitements"],
  dossierId?: Dossier["id"],
) {
  return traitements.map(({ dateTraitement, state, emailAgentTraitant, motivation }) => ({
    phase: traitementPhaseToDossierPhase(state),
    dossier: dossierId,
    timestamp: new Date(dateTraitement),
    caused_by_personne: null,
    demarche_numerique_agent_email: emailAgentTraitant,
    demarche_numerique_motivation: motivation,
  }));
}

export function makeDecisionAdministrativeFromTraitementDS(
  dossierDS: DossierDS88444,
  downloadedFichiersMotivation: Map<DossierDS88444["number"], FileId> | undefined,
  dossierId: DecisionAdministrative["dossier"] | null,
): PartialBy<DecisionAdministrativeInitializer, "dossier">[] {
  const fichier = downloadedFichiersMotivation?.get(dossierDS.number);
  if (!fichier) return [];

  let lastTraitement = dossierDS.traitements[0];
  for (const traitement of dossierDS.traitements) {
    if (isAfter(traitement.dateTraitement, lastTraitement.dateTraitement)) {
      lastTraitement = traitement;
    }
  }
  let type: TypeDecisionAdministrative = "Autre décision";
  if (lastTraitement.state === "accepte") type = "Arrêté dérogation";
  if (lastTraitement.state === "refuse") type = "Arrêté refus";
  return [
    {
      dossier: dossierId ?? undefined,
      fichier,
      type,
      signature_date: null,
      number: null,
      obligations_end_date: null,
    },
  ];
}
