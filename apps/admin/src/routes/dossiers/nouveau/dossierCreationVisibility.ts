import {
  dossierMainActivitesWithoutRequestContext,
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  motifDerogationOptions,
  requiresCompleteDossierAttachment,
  requiresNoDerogationArgumentAttachment,
  requiresOperationDates,
  requiresScientificDemandeType,
  requiresScientificPurposes,
  requiresSpeciesFile,
  restaurationMainActivite,
  scientifiqueDemandeTypeOptions,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";

import type { DossierCreationModel, MainActivite } from "./dossierCreationState.ts";

const ACTIVITES_WITHOUT_REQUEST_CONTEXT = new Set<MainActivite>([
  ...dossierMainActivitesWithoutRequestContext,
]);

export const ACCOMPANIMENT_CONTEXT = dossierRequestContextOptions[0];

export function showsRequestContext(mainActivite: MainActivite): boolean {
  return !!mainActivite && !ACTIVITES_WITHOUT_REQUEST_CONTEXT.has(mainActivite);
}

export function showsSpeciesSection(model: DossierCreationModel): boolean {
  return requiresSpeciesFile(model.mainActivite, model.requestContext);
}

export function showsDestroyedNidsCount(model: DossierCreationModel): boolean {
  return (
    model.mainActivite === restaurationMainActivite &&
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
    model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité"
  );
}

export function showsWindFarmDetails(model: DossierCreationModel): boolean {
  return model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité";
}

export function showsOperationDates(model: DossierCreationModel): boolean {
  return requiresOperationDates(model.mainActivite, model.requestContext);
}

export function showsDerogationDuration(model: DossierCreationModel): boolean {
  return (
    showsRequestContext(model.mainActivite) &&
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

export function activiteDetailKind(
  mainActivite: MainActivite,
): "restauration" | "transport" | null {
  if (mainActivite === restaurationMainActivite) return "restauration";
  if (transportMainActivites.includes(mainActivite as (typeof transportMainActivites)[number])) {
    return "transport";
  }
  return null;
}

export function showsCompensatedNidsCount(model: DossierCreationModel): boolean {
  const detailKind = activiteDetailKind(model.mainActivite);
  return (
    (detailKind === "restauration" &&
      model.activiteDetail === "Destruction de nids d'Hirondelles") ||
    (detailKind === "transport" && model.activiteDetail === "Destruction de nids de Cigognes")
  );
}

export function showsCompleteDossierFiles(model: DossierCreationModel): boolean {
  return requiresCompleteDossierAttachment(
    model.mainActivite,
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
  if (model.mainActivite === "Desaîrage") return motifDerogationOptions[6];
  if (
    [
      "Demande à caractère scientifique",
      "Pédagogique enseignement",
      "Production énergie renouvelable - Éolien -  Suivi mortalité",
    ].includes(model.mainActivite)
  ) {
    return motifDerogationOptions[4];
  }
  return motifDerogationOptions[0];
}

export function motifDerogationGuidance(model: DossierCreationModel): string {
  const suggestion = suggestedMotifDerogation(model);
  if (
    [
      "Demande à caractère scientifique",
      "Desaîrage",
      "Pédagogique enseignement",
      "Production énergie renouvelable - Éolien -  Suivi mortalité",
    ].includes(model.mainActivite)
  ) {
    return `Vous avez renseigné comme objectif principal "${model.mainActivite}" en début de formulaire. Le motif de la dérogation à renseigner ci-dessous semble être : "${suggestion}"`;
  }
  return `Compte tenu de l'objectif principal de votre projet, rempli, au point 1., le motif de la dérogation à renseigner ci-dessous semble être : "${suggestion}"`;
}
