import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

export type TriState = "" | "oui" | "non";
export type Commune = {
  name: string;
  code?: string;
  postalCode?: string;
  [key: string]: unknown;
};
export type ScientificIntervenant = {
  nom_complet: string | null;
  qualification: string | null;
};
export type FeatureCollection = {
  type: "FeatureCollection";
  features: unknown[];
  [key: string]: unknown;
};

type DossierAdminColumnModel = ReturnType<typeof createDossierAdminColumnModel>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const date = (value: unknown) => (typeof value === "string" && value ? value.slice(0, 10) : "");
const triState = (value: unknown): TriState =>
  value === true ? "oui" : value === false ? "non" : "";
const stringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const integer = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
const nullableText = (value: string) => value.trim() || null;
const nullableDate = (value: string) => value || null;
const nullableBoolean = (value: TriState) =>
  value === "oui" ? true : value === "non" ? false : null;

function communes(value: unknown): Commune[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Commune =>
        !!item && typeof item === "object" && typeof (item as Commune).name === "string",
    )
    .map((item) => ({ ...item }));
}

function intervenants(value: unknown): ScientificIntervenant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        nom_complet: typeof row.nom_complet === "string" ? row.nom_complet : null,
        qualification: typeof row.qualification === "string" ? row.qualification : null,
      };
    });
}

function featureCollection(value: unknown): FeatureCollection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const map = value as Record<string, unknown>;
  return map.type === "FeatureCollection" && Array.isArray(map.features)
    ? ({ ...map, type: "FeatureCollection", features: [...map.features] } as FeatureCollection)
    : null;
}

export function createDossierAdminColumnModel(dossier: AdminDossierDetail["dossier"]) {
  return {
    name: text(dossier.name),
    description: text(dossier.description),
    depotDate: date(dossier.depot_date),
    mainActivite: text(dossier.main_activite),
    type: text(dossier.type),
    interventionStartDate: date(dossier.intervention_start_date),
    interventionEndDate: date(dossier.intervention_end_date),
    commissioningDate: date(dossier.commissioning_date),
    interventionDuration: integer(dossier.intervention_duration),
    communes: communes(dossier.communes),
    departments: stringList(dossier.departments),
    regions: stringList(dossier.regions),
    projetMap: featureCollection(dossier.projet_map),
    linkedToAeRegime: triState(dossier.linked_to_ae_regime),
    mesuresErcPlanned: triState(dossier.mesures_erc_planned),
    ecologicalInventoryCompleted: triState(dossier.ecological_inventory_completed),
    especesPresentInInfluenceArea: triState(dossier.especes_present_in_influence_area),
    riskDespiteErcMesures: triState(dossier.risk_despite_erc_mesures),
    noOtherSatisfactorySolutionJustification: text(
      dossier.no_other_satisfactory_solution_justification,
    ),
    motifDerogation: text(dossier.motif_derogation),
    motifDerogationJustification: text(dossier.motif_derogation_justification),
    destroyedNidsCount: integer(dossier.dossier_oiseau_simple_destroyed_nids_count),
    compensatedNidsCount: integer(dossier.dossier_oiseau_simple_compensated_nids_count),
    scientifiqueDemandeType: stringList(dossier.scientifique_demande_type),
    scientifiqueDemandePurposes: stringList(dossier.scientifique_demande_purposes),
    scientifiquePreviousAssessment: triState(dossier.scientifique_previous_assessment),
    scientifiqueSuiviProtocolDescription: text(dossier.scientifique_suivi_protocol_description),
    scientifiqueCaptureMode: stringList(dossier.scientifique_capture_mode),
    scientifiqueLightSourceConditions: text(dossier.scientifique_light_source_conditions),
    scientifiqueMarkingConditions: text(dossier.scientifique_marking_conditions),
    scientifiqueTransportConditions: text(dossier.scientifique_transport_conditions),
    scientifiqueInterventionPerimeter: text(dossier.scientifique_intervention_perimeter),
    scientifiqueIntervenants: intervenants(dossier.scientifique_intervenants),
    scientifiqueOtherIntervenantsDetails: text(dossier.scientifique_other_intervenants_details),
    freeComment: text(dossier.free_comment),
    nextActionExpectedFrom: text(dossier.next_action_expected_from),
    onagreDemandeIdentifier: text(dossier.onagre_demande_identifier),
    enjeu: dossier.enjeu === true,
    ddepRequired: triState(dossier.ddep_required),
    erMesuresSufficient: triState(dossier.er_mesures_sufficient),
    publicConsultationStartDate: date(dossier.public_consultation_start_date),
    publicConsultationEndDate: date(dossier.public_consultation_end_date),
  };
}

export function buildDossierUpdateColumns(model: DossierAdminColumnModel, managedByDn: boolean) {
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
    communes: model.communes,
    departments: model.departments,
    regions: model.regions,
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
    dossier_oiseau_simple_compensated_nids_count: model.compensatedNidsCount,
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
    scientifique_intervenants: model.scientifiqueIntervenants.map((item) => ({
      nom_complet: nullableText(item.nom_complet ?? ""),
      qualification: nullableText(item.qualification ?? ""),
    })),
    scientifique_other_intervenants_details: nullableText(
      model.scientifiqueOtherIntervenantsDetails,
    ),
    ...nativeColumns,
  };
}
