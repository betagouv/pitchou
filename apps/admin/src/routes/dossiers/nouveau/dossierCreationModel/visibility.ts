import {
  ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT,
  DEMANDE_SCIENTIFIQUE_ACTIVITE_CODE,
  DESAIRAGE_ACTIVITE_CODE,
  EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE,
  PEDAGOGIQUE_ENSEIGNEMENT_ACTIVITE_CODE,
  RESTAURATION_BATIMENTS_ACTIVITE_CODE,
  TRANSPORT_ACTIVITE_CODES,
} from "@pitchou/common/activiteCodes.ts";
import {
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  motifDerogationOptions,
  requiresCompleteDossierAttachment,
  requiresNoDerogationArgumentAttachment,
  requiresOperationDates,
  requiresScientificDemandeType,
  requiresScientificPurposes,
  requiresSpeciesFile,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

import type { DossierCreationModel } from "./state.ts";

const CODES_WITHOUT_REQUEST_CONTEXT = new Set<string>(ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT);

export const ACCOMPANIMENT_CONTEXT = dossierRequestContextOptions[0];

export function showsRequestContext(activiteCode: string): boolean {
  return !!activiteCode && !CODES_WITHOUT_REQUEST_CONTEXT.has(activiteCode);
}

export function showsSpeciesSection(model: DossierCreationModel): boolean {
  return requiresSpeciesFile(model.activiteCode, model.requestContext);
}

export function showsDestroyedNidsCount(model: DossierCreationModel): boolean {
  return (
    model.activiteCode === RESTAURATION_BATIMENTS_ACTIVITE_CODE &&
    model.activiteDetail === "Destruction de nids d'Hirondelles"
  );
}

export function showsScientificPurposes(model: DossierCreationModel): boolean {
  return (
    requiresScientificDemandeType(model.motifDerogation) &&
    requiresScientificPurposes(model.scientifiqueDemandeType)
  );
}

export function showsPreviousAssessment(model: DossierCreationModel): boolean {
  return (
    requiresScientificDemandeType(model.motifDerogation) ||
    model.activiteCode === EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE
  );
}

export function showsWindFarmDetails(model: DossierCreationModel): boolean {
  return model.activiteCode === EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE;
}

export function showsOperationDates(model: DossierCreationModel): boolean {
  return requiresOperationDates(model.activiteCode, model.requestContext);
}

export function showsDerogationDuration(model: DossierCreationModel): boolean {
  return (
    showsRequestContext(model.activiteCode) &&
    model.requestContext === dossierRequestContextOptions[2]
  );
}

export function showsOperationDetails(model: DossierCreationModel): boolean {
  return (
    (showsSpeciesSection(model) && requiresScientificDemandeType(model.motifDerogation)) ||
    showsWindFarmDetails(model)
  );
}

export function showsCarcassAnalysis(model: DossierCreationModel): boolean {
  return (
    showsWindFarmDetails(model) &&
    model.eolienMortalityActions.includes(eolienMortalityActionOptions[1])
  );
}

export function showsScientificCaptureDetails(model: DossierCreationModel): boolean {
  return (
    showsSpeciesSection(model) &&
    requiresScientificDemandeType(model.motifDerogation) &&
    model.scientifiqueDemandeType.some((value) =>
      scientifiqueDemandeTypeOptions.slice(0, 3).includes(value as never),
    )
  );
}

export function activiteDetailKind(activiteCode: string): "restauration" | "transport" | null {
  if (activiteCode === RESTAURATION_BATIMENTS_ACTIVITE_CODE) return "restauration";
  if (
    TRANSPORT_ACTIVITE_CODES.includes(activiteCode as (typeof TRANSPORT_ACTIVITE_CODES)[number])
  ) {
    return "transport";
  }
  return null;
}

export function showsCompensatedNidsCount(model: DossierCreationModel): boolean {
  const detailKind = activiteDetailKind(model.activiteCode);
  return (
    (detailKind === "restauration" &&
      model.activiteDetail === "Destruction de nids d'Hirondelles") ||
    (detailKind === "transport" && model.activiteDetail === "Destruction de nids de Cigognes")
  );
}

export function showsCompleteDossierFiles(model: DossierCreationModel): boolean {
  return requiresCompleteDossierAttachment(
    model.activiteCode,
    model.requestContext,
    model.motifDerogation,
  );
}

export function showsNoDerogationArgumentFiles(model: DossierCreationModel): boolean {
  return requiresNoDerogationArgumentAttachment(model.requestContext);
}

export function selectedDossierAttachmentFiles(model: DossierCreationModel): File[] {
  return [
    ...(showsScientificPurposes(model) ? model.purposeFiles : []),
    ...(showsPreviousAssessment(model) && model.scientifiquePreviousAssessment === "oui"
      ? model.previousAssessmentFiles
      : []),
    ...(showsWindFarmDetails(model) && model.scientifiqueMortalityMeasuresTaken === "oui"
      ? model.mortalityMeasureFiles
      : []),
    ...(showsWindFarmDetails(model)
      ? [...model.windFarmPlanFiles, ...model.eolienProtocolFiles]
      : []),
    ...(showsOperationDetails(model)
      ? model.scientifiqueIntervenants.flatMap(({ cvFiles }) => cvFiles)
      : []),
    ...(showsCompleteDossierFiles(model) ? model.completeDossierFiles : []),
    ...(showsNoDerogationArgumentFiles(model) ? model.noDerogationArgumentFiles : []),
    ...model.supplementalFiles,
  ];
}

export function clearSelectedDossierFiles(model: DossierCreationModel): void {
  model.speciesFile = null;
  model.purposeFiles = [];
  model.previousAssessmentFiles = [];
  model.mortalityMeasureFiles = [];
  model.windFarmPlanFiles = [];
  model.eolienProtocolFiles = [];
  for (const intervenant of model.scientifiqueIntervenants) intervenant.cvFiles = [];
  model.completeDossierFiles = [];
  model.noDerogationArgumentFiles = [];
  model.supplementalFiles = [];
}

export function suggestedMotifDerogation(model: DossierCreationModel): string {
  if (model.activiteCode === DESAIRAGE_ACTIVITE_CODE) return motifDerogationOptions[6];
  if (
    [
      DEMANDE_SCIENTIFIQUE_ACTIVITE_CODE,
      PEDAGOGIQUE_ENSEIGNEMENT_ACTIVITE_CODE,
      EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE,
    ].includes(model.activiteCode)
  ) {
    return motifDerogationOptions[4];
  }
  return motifDerogationOptions[0];
}

export function motifDerogationGuidance(model: DossierCreationModel): string {
  const suggestion = suggestedMotifDerogation(model);
  if (CODES_WITHOUT_REQUEST_CONTEXT.has(model.activiteCode)) {
    return `Vous avez renseigné comme objectif principal "${model.mainActivite}" en début de formulaire. Le motif de la dérogation à renseigner ci-dessous semble être : "${suggestion}"`;
  }
  return `Compte tenu de l'objectif principal de votre projet, rempli, au point 1., le motif de la dérogation à renseigner ci-dessous semble être : "${suggestion}"`;
}
