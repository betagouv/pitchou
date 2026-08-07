import {
  requiresEspecesPriseDetentionLimiteeType,
  requiresScientificDemandeType,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

import type { DossierCreationModel } from "./state.ts";
import {
  ACCOMPANIMENT_CONTEXT,
  showsCarcassAnalysis,
  showsCompensatedNidsCount,
  showsDerogationDuration,
  showsDestroyedNidsCount,
  showsOperationDates,
  showsOperationDetails,
  showsPreviousAssessment,
  showsScientificCaptureDetails,
  showsScientificPurposes,
  showsSpeciesSection,
  showsWindFarmDetails,
} from "./visibility.ts";

const nullable = (value: string) => value.trim() || null;

export function buildCreationColumns(
  model: DossierCreationModel,
  type: string | null,
  requestContext: string | null,
) {
  return {
    description: nullable(model.description),
    urgent_contact_phone: model.urgentContactPhone.trim(),
    main_activite: nullable(model.mainActivite),
    type,
    request_context: requestContext,
    accompaniment_need:
      requestContext === ACCOMPANIMENT_CONTEXT ? nullable(model.accompanimentNeed) : null,
    location_scope: nullable(model.locationScope),
    primary_department: nullable(model.primaryDepartment),
    no_other_satisfactory_solution_justification: showsSpeciesSection(model)
      ? nullable(model.noOtherSatisfactorySolutionJustification)
      : null,
    motif_derogation: showsSpeciesSection(model) ? nullable(model.motifDerogation) : null,
    motif_derogation_justification: showsSpeciesSection(model)
      ? nullable(model.motifDerogationJustification)
      : null,
    scientifique_demande_type:
      showsSpeciesSection(model) && requiresScientificDemandeType(model.motifDerogation)
        ? model.scientifiqueDemandeType
        : null,
    linked_to_ae_regime:
      model.aeRegime === "oui"
        ? true
        : model.aeRegime === "non"
          ? false
          : model.aeRegime === "unknown"
            ? ("unknown" as never)
            : null,
    ae_procedures: model.aeRegime === "oui" ? model.aeProcedures : null,
    ae_other_procedure:
      model.aeRegime === "oui" && model.aeProcedures.includes("Autre")
        ? nullable(model.aeOtherProcedure)
        : null,
    dossier_oiseau_simple_destroyed_nids_count: showsDestroyedNidsCount(model)
      ? model.destroyedNidsCount
      : null,
    especes_prise_detention_limitee_type: requiresEspecesPriseDetentionLimiteeType(
      model.motifDerogation,
    )
      ? nullable(model.especesPriseDetentionLimiteeType)
      : null,
    scientifique_demande_purposes: showsScientificPurposes(model)
      ? model.scientifiqueDemandePurposes
      : null,
    scientifique_previous_assessment: showsPreviousAssessment(model)
      ? model.scientifiquePreviousAssessment === "oui"
        ? true
        : model.scientifiquePreviousAssessment === "non"
          ? false
          : null
      : null,
    scientifique_mortality_measures_taken: showsWindFarmDetails(model)
      ? model.scientifiqueMortalityMeasuresTaken === "oui"
        ? true
        : model.scientifiqueMortalityMeasuresTaken === "non"
          ? false
          : null
      : null,
    scientifique_mortality_measures_details:
      showsWindFarmDetails(model) && model.scientifiqueMortalityMeasuresTaken === "oui"
        ? nullable(model.scientifiqueMortalityMeasuresDetails)
        : null,
    eolien_commissioning_year: showsWindFarmDetails(model) ? model.eolienCommissioningYear : null,
    eolien_turbines_count: showsWindFarmDetails(model) ? model.eolienTurbinesCount : null,
    eolien_tip_height: showsWindFarmDetails(model) ? model.eolienTipHeight : null,
    eolien_rotor_diameter: showsWindFarmDetails(model) ? model.eolienRotorDiameter : null,
    eolien_ground_clearance: showsWindFarmDetails(model) ? model.eolienGroundClearance : null,
    intervention_start_date: showsOperationDates(model)
      ? nullable(model.interventionStartDate)
      : null,
    intervention_end_date: showsOperationDates(model) ? nullable(model.interventionEndDate) : null,
    commissioning_date: showsOperationDates(model) ? nullable(model.commissioningDate) : null,
    intervention_duration: showsDerogationDuration(model) ? model.interventionDuration : null,
    scientifique_suivi_protocol_description: showsOperationDetails(model)
      ? nullable(model.scientifiqueSuiviProtocolDescription)
      : null,
    eolien_monitored_turbines_count: showsWindFarmDetails(model)
      ? model.eolienMonitoredTurbinesCount
      : null,
    eolien_field_inventory_period: showsWindFarmDetails(model)
      ? nullable(model.eolienFieldInventoryPeriod)
      : null,
    eolien_monitoring_visits_count: showsWindFarmDetails(model)
      ? model.eolienMonitoringVisitsCount
      : null,
    eolien_weekly_monitoring_visits_count: showsWindFarmDetails(model)
      ? model.eolienWeeklyMonitoringVisitsCount
      : null,
    eolien_mortality_actions: showsWindFarmDetails(model) ? model.eolienMortalityActions : null,
    eolien_carcass_collection_method: showsCarcassAnalysis(model)
      ? nullable(model.eolienCarcassCollectionMethod)
      : null,
    eolien_carcass_preservation_method: showsCarcassAnalysis(model)
      ? nullable(model.eolienCarcassPreservationMethod)
      : null,
    eolien_carcass_examination_address: showsCarcassAnalysis(model)
      ? nullable(model.eolienCarcassExaminationAddress)
      : null,
    scientifique_capture_mode: showsScientificCaptureDetails(model)
      ? [
          ...model.scientifiqueCaptureModes.filter(
            (value) => value !== "Autre moyen de capture (préciser)",
          ),
          ...(model.scientifiqueCaptureModes.includes("Autre moyen de capture (préciser)") &&
          model.scientifiqueOtherCaptureMode.trim()
            ? [model.scientifiqueOtherCaptureMode.trim()]
            : []),
        ]
      : null,
    scientifique_light_source_conditions:
      showsScientificCaptureDetails(model) && model.scientifiqueUsesLightSources === "oui"
        ? nullable(model.scientifiqueLightSourceConditions)
        : null,
    scientifique_marking_conditions:
      showsScientificCaptureDetails(model) &&
      model.scientifiqueDemandeType.includes(scientifiqueDemandeTypeOptions[1])
        ? nullable(model.scientifiqueMarkingConditions)
        : null,
    scientifique_transport_conditions:
      showsScientificCaptureDetails(model) &&
      model.scientifiqueDemandeType.includes(scientifiqueDemandeTypeOptions[2])
        ? nullable(model.scientifiqueTransportConditions)
        : null,
    scientifique_intervenants: showsOperationDetails(model)
      ? model.scientifiqueIntervenants
          .filter(({ nom_complet, qualification }) => nom_complet.trim() || qualification.trim())
          .map(({ nom_complet, qualification }) => ({
            nom_complet: nullable(nom_complet),
            qualification: nullable(qualification),
          }))
      : null,
    scientifique_other_intervenants_details: showsOperationDetails(model)
      ? nullable(model.scientifiqueOtherIntervenantsDetails)
      : null,
    dossier_oiseau_simple_compensated_nids_count: showsCompensatedNidsCount(model)
      ? model.compensatedNidsCount
      : null,
  };
}
