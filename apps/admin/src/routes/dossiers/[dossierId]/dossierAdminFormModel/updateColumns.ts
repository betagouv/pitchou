import {
  activiteCodeForLabel,
  EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE,
} from "@pitchou/common/activiteCodes.ts";
import { requiresScientificDemandeType } from "@pitchou/common/dossierFormOptions.ts";
import { communeDepartmentCode } from "$lib/dossierLocation.ts";
import type { DossierAdminColumnModel, TriState } from "./columnModel.ts";

const nullableText = (value: string) => value.trim() || null;
const nullableDate = (value: string) => value || null;
const nullableBoolean = (value: TriState) =>
  value === "oui" ? true : value === "non" ? false : null;

export function buildDossierUpdateColumns(
  model: DossierAdminColumnModel,
  managedByDn: boolean,
  activiteCodeByLabel: ReadonlyMap<string, string>,
) {
  const nativeColumns: Record<string, unknown> = {
    free_comment: model.freeComment,
    next_action_expected_from: nullableText(model.nextActionExpectedFrom),
    onagre_demande_identifier: model.onagreDemandeIdentifier,
    enjeu: model.enjeu,
    ddep_required: nullableBoolean(model.ddepRequired),
    er_mesures_sufficient: nullableBoolean(model.erMesuresSufficient),
    public_consultation_start_date: nullableDate(model.publicConsultationStartDate),
    public_consultation_end_date: nullableDate(model.publicConsultationEndDate),
  };
  if (managedByDn) return nativeColumns;
  const departments =
    model.locationScope === "communes"
      ? [...new Set(model.communes.map(communeDepartmentCode).filter(Boolean))]
      : model.locationScope === "departements"
        ? model.departments
        : [];
  const showsIntervenants =
    requiresScientificDemandeType(model.motifDerogation) ||
    activiteCodeForLabel(model.mainActivite, activiteCodeByLabel) ===
      EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE;
  return {
    name: nullableText(model.name),
    description: nullableText(model.description),
    depot_date: model.depotDate,
    main_activite: nullableText(model.mainActivite),
    type: nullableText(model.type),
    intervention_start_date: nullableDate(model.interventionStartDate),
    intervention_end_date: nullableDate(model.interventionEndDate),
    commissioning_date: nullableDate(model.commissioningDate),
    intervention_duration: model.interventionDuration,
    communes: model.communes.map(({ departmentCode: _, ...commune }) => commune),
    departments,
    regions: model.regions,
    location_scope: nullableText(model.locationScope),
    primary_department: nullableText(model.primaryDepartment),
    projet_map: model.projetMap,
    linked_to_ae_regime: nullableBoolean(model.linkedToAeRegime),
    mesures_erc_planned: nullableBoolean(model.mesuresErcPlanned),
    ecological_inventory_completed: nullableBoolean(model.ecologicalInventoryCompleted),
    especes_present_in_influence_area: nullableBoolean(model.especesPresentInInfluenceArea),
    risk_despite_erc_mesures: nullableBoolean(model.riskDespiteErcMesures),
    no_other_satisfactory_solution_justification: nullableText(
      model.noOtherSatisfactorySolutionJustification,
    ),
    motif_derogation: nullableText(model.motifDerogation),
    motif_derogation_justification: nullableText(model.motifDerogationJustification),
    dossier_oiseau_simple_destroyed_nids_count: model.destroyedNidsCount,
    dossier_oiseau_simple_compensated_nids_count: ["Hirondelle", "Cigogne"].includes(model.type)
      ? model.compensatedNidsCount
      : null,
    scientifique_demande_type: model.scientifiqueDemandeType,
    scientifique_demande_purposes: model.scientifiqueDemandePurposes,
    scientifique_previous_assessment: nullableBoolean(model.scientifiquePreviousAssessment),
    scientifique_suivi_protocol_description: nullableText(
      model.scientifiqueSuiviProtocolDescription,
    ),
    scientifique_capture_mode: model.scientifiqueCaptureMode.filter(Boolean),
    scientifique_light_source_conditions: nullableText(model.scientifiqueLightSourceConditions),
    scientifique_marking_conditions: nullableText(model.scientifiqueMarkingConditions),
    scientifique_transport_conditions: nullableText(model.scientifiqueTransportConditions),
    scientifique_intervention_perimeter: nullableText(model.scientifiqueInterventionPerimeter),
    scientifique_intervenants: showsIntervenants
      ? model.scientifiqueIntervenants.map((item) => ({
          nom_complet: nullableText(item.nom_complet ?? ""),
          qualification: nullableText(item.qualification ?? ""),
        }))
      : null,
    scientifique_other_intervenants_details: showsIntervenants
      ? nullableText(model.scientifiqueOtherIntervenantsDetails)
      : null,
    ...nativeColumns,
  };
}
