import {
  requiresEspecesPriseDetentionLimiteeType,
  requiresScientificDemandeType,
} from "@pitchou/common/dossierFormOptions.ts";
import type { DossierCreationModel } from "./dossierCreationModel.ts";
import {
  selectedDossierAttachmentFiles,
  showsCompensatedNidsCount,
  showsCompleteDossierFiles,
  showsDestroyedNidsCount,
  showsNoDerogationArgumentFiles,
  showsOperationDetails,
  showsPreviousAssessment,
  showsScientificPurposes,
  showsSpeciesSection,
  showsWindFarmDetails,
} from "./dossierCreationModel.ts";

export function validateDossierCreation(model: DossierCreationModel): string | null {
  const needsSpeciesFile = showsSpeciesSection(model);
  if (!model.depotDate) return "La date de dépôt est requise.";
  if (needsSpeciesFile && !model.speciesFile) {
    requestAnimationFrame(() => document.getElementById("species-file-button")?.focus());
    return "Le fichier des espèces concernées est requis.";
  }
  if (
    needsSpeciesFile &&
    (!model.noOtherSatisfactorySolutionJustification.trim() ||
      !model.motifDerogation ||
      !model.motifDerogationJustification.trim())
  ) {
    return "Les justifications de la demande de dérogation sont requises.";
  }
  if (showsCompleteDossierFiles(model) && model.completeDossierFiles.length === 0) {
    return "Le dossier complet de demande de dérogation est requis.";
  }
  if (showsNoDerogationArgumentFiles(model) && model.noDerogationArgumentFiles.length === 0) {
    return "L'argumentaire concluant à l'absence de nécessité de dérogation est requis.";
  }
  const files = [
    ...(needsSpeciesFile && model.speciesFile ? [model.speciesFile] : []),
    ...selectedDossierAttachmentFiles(model),
  ];
  if (files.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
    return "La taille totale des fichiers ne doit pas dépasser 65 Mo.";
  }
  if (!model.description.trim() || !model.aeRegime) {
    return "La description du projet et son régime d'autorisation sont requis.";
  }
  if (model.aeRegime === "oui" && model.aeProcedures.length === 0) {
    return "Sélectionnez au moins une procédure d'autorisation environnementale.";
  }
  if (model.aeProcedures.includes("Autre") && !model.aeOtherProcedure.trim()) {
    return "Précisez la procédure justifiant l'autorisation environnementale.";
  }
  if (
    showsDestroyedNidsCount(model) &&
    (!model.destroyedNidsCount || model.destroyedNidsCount < 1)
  ) {
    return "Le nombre de nids d'Hirondelles à détruire est requis.";
  }
  if (
    requiresEspecesPriseDetentionLimiteeType(model.motifDerogation) &&
    !model.especesPriseDetentionLimiteeType
  ) {
    return "Précisez le type de prise ou de détention.";
  }
  if (showsPreviousAssessment(model) && !model.scientifiquePreviousAssessment) {
    return "Indiquez si la demande concerne un programme de suivi existant.";
  }
  if (
    showsPreviousAssessment(model) &&
    model.scientifiquePreviousAssessment === "oui" &&
    model.previousAssessmentFiles.length === 0
  ) {
    return "Le bilan des opérations antérieures est requis.";
  }
  if (showsWindFarmDetails(model) && !model.scientifiqueMortalityMeasuresTaken) {
    return "Indiquez si des mesures complémentaires ont été prises.";
  }
  if (
    showsCompensatedNidsCount(model) &&
    (!model.compensatedNidsCount || model.compensatedNidsCount < 1)
  ) {
    return "Le nombre de nids artificiels posés en compensation est requis.";
  }
  if (
    needsSpeciesFile &&
    requiresScientificDemandeType(model.motifDerogation) &&
    model.scientifiqueDemandeType.length === 0
  ) {
    return "Sélectionnez au moins un type de demande scientifique.";
  }
  return null;
}

export function dossierCreationAttachments(model: DossierCreationModel) {
  return {
    purpose: showsScientificPurposes(model) ? model.purposeFiles : [],
    previousAssessment:
      showsPreviousAssessment(model) && model.scientifiquePreviousAssessment === "oui"
        ? model.previousAssessmentFiles
        : [],
    mortalityMeasures:
      showsWindFarmDetails(model) && model.scientifiqueMortalityMeasuresTaken === "oui"
        ? model.mortalityMeasureFiles
        : [],
    windFarmPlan: showsWindFarmDetails(model) ? model.windFarmPlanFiles : [],
    eolienProtocol: showsWindFarmDetails(model) ? model.eolienProtocolFiles : [],
    intervenantCv: showsOperationDetails(model)
      ? model.scientifiqueIntervenants.flatMap(({ cvFiles }) => cvFiles)
      : [],
    completeDossier: showsCompleteDossierFiles(model) ? model.completeDossierFiles : [],
    noDerogationArgument: showsNoDerogationArgumentFiles(model)
      ? model.noDerogationArgumentFiles
      : [],
    supplemental: model.supplementalFiles,
  };
}
