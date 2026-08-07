import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
export { buildDossierUpdateColumns } from "./updateColumns.ts";

export type TriState = "" | "oui" | "non";
export type LocationScope = "" | "communes" | "departements" | "regions" | "france";
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
  features: ProjectMapFeature[];
  [key: string]: unknown;
};
export type ProjectMapFeature = {
  type: "Feature";
  geometry: { type: string; coordinates?: unknown; geometries?: unknown };
  properties: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type DossierAdminColumnModel = ReturnType<typeof createDossierAdminColumnModel>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const date = (value: unknown) => (typeof value === "string" && value ? value.slice(0, 10) : "");
const triState = (value: unknown): TriState =>
  value === true ? "oui" : value === false ? "non" : "";
const stringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const integer = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
const positiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
const locationScope = (value: unknown, dossier: AdminDossierDetail["dossier"]): LocationScope => {
  if (["communes", "departements", "regions", "france"].includes(value as string)) {
    return value as LocationScope;
  }
  if (Array.isArray(dossier.communes) && dossier.communes.length >= 1) return "communes";
  if (Array.isArray(dossier.regions) && dossier.regions.length >= 1) return "regions";
  if (Array.isArray(dossier.departments) && dossier.departments.length >= 1) return "departements";
  return "";
};

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
    interventionDuration: positiveNumber(dossier.intervention_duration),
    communes: communes(dossier.communes),
    departments: stringList(dossier.departments),
    regions: stringList(dossier.regions),
    locationScope: locationScope(dossier.location_scope, dossier),
    primaryDepartment: text(dossier.primary_department),
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
