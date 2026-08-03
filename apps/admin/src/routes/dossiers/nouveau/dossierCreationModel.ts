import {
  dossierMainActivitesWithoutRequestContext,
  dossierMainActiviteOptions,
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  motifDerogationOptions,
  requiresScientificPurposes,
  requiresScientificDemandeType,
  requiresCompleteDossierAttachment,
  requiresNoDerogationArgumentAttachment,
  scientifiqueDemandeTypeOptions,
  requiresSpeciesFile,
  restaurationMainActivite,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";

import type { AdminDossierCreationPayload } from "$lib/actions/adminDossiers.ts";
import { communeDepartmentCode } from "$lib/dossierLocation.ts";

type CreationCommune = {
  name: string;
  code?: string;
  postalCode?: string;
  departmentCode?: string;
};
type CreationProjectMap = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: string; coordinates?: unknown; geometries?: unknown };
    properties: Record<string, unknown> | null;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
};

export type DemandeurType = "" | "personne_physique" | "personne_morale";
export type MainActivite = (typeof dossierMainActiviteOptions)[number] | "";

export type DossierCreationModel = ReturnType<typeof createDossierCreationModel>;

const ACTIVITES_WITHOUT_REQUEST_CONTEXT = new Set<MainActivite>([
  ...dossierMainActivitesWithoutRequestContext,
]);

export const ACCOMPANIMENT_CONTEXT = dossierRequestContextOptions[0];

export function createDossierCreationModel() {
  return {
    urgentContactPhone: "",
    name: "",
    mainActivite: "" as MainActivite,
    activiteDetail: "",
    requestContext: "",
    accompanimentNeed: "",
    demandeurType: "" as DemandeurType,
    physicalLastName: "",
    physicalFirstNames: "",
    physicalQualification: "",
    physicalAddress: "",
    physicalManualAddress: false,
    physicalCountry: "France",
    physicalOtherCountry: "",
    physicalStreet: "",
    physicalCity: "",
    legalSiret: "",
    representativeLastName: "",
    representativeFirstNames: "",
    representativeRole: "",
    contactPhone: "",
    contactEmail: "",
    primaryDepartment: "",
    locationScope: "" as "" | "communes" | "departements" | "regions" | "france",
    communes: [] as CreationCommune[],
    locationDepartments: [] as string[],
    locationRegions: [] as string[],
    projectMap: null as CreationProjectMap | null,
    speciesFile: null as File | null,
    noOtherSatisfactorySolutionJustification: "",
    motifDerogation: "",
    motifDerogationJustification: "",
    scientifiqueDemandeType: [] as string[],
    description: "",
    aeRegime: "" as "" | "oui" | "non" | "unknown",
    aeProcedures: [] as string[],
    aeOtherProcedure: "",
    destroyedNidsCount: null as number | null,
    limitedSpecimenType: "",
    scientifiqueDemandePurposes: [] as string[],
    purposeFiles: [] as File[],
    scientifiquePreviousAssessment: "" as "" | "oui" | "non",
    previousAssessmentFiles: [] as File[],
    scientifiqueMortalityMeasuresTaken: "" as "" | "oui" | "non",
    scientifiqueMortalityMeasuresDetails: "",
    mortalityMeasureFiles: [] as File[],
    eolienCommissioningYear: null as number | null,
    eolienTurbinesCount: null as number | null,
    eolienTipHeight: null as number | null,
    eolienRotorDiameter: null as number | null,
    eolienGroundClearance: null as number | null,
    windFarmPlanFiles: [] as File[],
    interventionStartDate: "",
    interventionEndDate: "",
    commissioningDate: "",
    interventionDuration: null as number | null,
    scientifiqueSuiviProtocolDescription: "",
    eolienMonitoredTurbinesCount: null as number | null,
    eolienFieldInventoryPeriod: "",
    eolienMonitoringVisitsCount: null as number | null,
    eolienWeeklyMonitoringVisitsCount: null as number | null,
    eolienProtocolFiles: [] as File[],
    eolienMortalityActions: [] as string[],
    eolienCarcassCollectionMethod: "",
    eolienCarcassPreservationMethod: "",
    eolienCarcassExaminationAddress: "",
    eolienCarcassAddressManual: false,
    scientifiqueCaptureModes: [] as string[],
    scientifiqueOtherCaptureMode: "",
    scientifiqueUsesLightSources: "" as "" | "oui" | "non",
    scientifiqueLightSourceConditions: "",
    scientifiqueMarkingConditions: "",
    scientifiqueTransportConditions: "",
    scientifiqueIntervenants: [{ nom_complet: "", qualification: "", cvFiles: [] as File[] }],
    scientifiqueOtherIntervenantsDetails: "",
    compensatedNidsCount: null as number | null,
    completeDossierFiles: [] as File[],
    noDerogationArgumentFiles: [] as File[],
    supplementalFiles: [] as File[],
    depotDate: new Date().toISOString().slice(0, 10),
    phase: "Accompagnement amont",
    groupeInstructeurs: "",
  };
}

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
  return (
    showsRequestContext(model.mainActivite) &&
    (model.requestContext === dossierRequestContextOptions[1] ||
      model.requestContext === dossierRequestContextOptions[2])
  );
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

export function activiteDetailKind(
  mainActivite: MainActivite,
): "restauration" | "transport" | null {
  if (mainActivite === restaurationMainActivite) {
    return "restauration";
  }
  if (transportMainActivites.includes(mainActivite as (typeof transportMainActivites)[number])) {
    return "transport";
  }
  return null;
}

const nullable = (value: string) => value.trim() || null;

export function buildCreationPayload(model: DossierCreationModel): AdminDossierCreationPayload {
  const contactEmail = nullable(model.contactEmail);
  const contactPhone = nullable(model.contactPhone);
  const commonIdentity = {
    email: contactEmail,
    phone: contactPhone,
  };
  const isPhysical = model.demandeurType === "personne_physique";
  const lastName = isPhysical ? model.physicalLastName.trim() : model.representativeLastName.trim();
  const firstNames = isPhysical
    ? model.physicalFirstNames.trim()
    : model.representativeFirstNames.trim();
  const role = nullable(isPhysical ? model.physicalQualification : model.representativeRole);
  const manualAddress = [model.physicalStreet, model.physicalCity].filter(Boolean).join(", ");
  const physicalCountry =
    model.physicalCountry === "Autre pays" ? model.physicalOtherCountry : model.physicalCountry;
  const physicalAddress = model.physicalManualAddress
    ? nullable([manualAddress, physicalCountry].filter(Boolean).join(", "))
    : nullable(model.physicalAddress);
  const communeDepartments = model.communes
    .map(communeDepartmentCode)
    .filter((value): value is string => !!value);
  const scopedDepartments =
    model.locationScope === "departements"
      ? model.locationDepartments
      : model.locationScope === "communes"
        ? communeDepartments
        : [];
  const departments = [...new Set(scopedDepartments)];
  const communes = model.communes.map(({ departmentCode: _, ...commune }) => commune);
  const identity = {
    type: "demandeur" as const,
    last_name: lastName,
    first_names: firstNames,
    ...commonIdentity,
    role,
  };
  const identites = isPhysical ? [identity] : [{ ...identity, type: "representant" as const }];
  const requestContext = showsRequestContext(model.mainActivite)
    ? nullable(model.requestContext)
    : null;
  const detailKind = activiteDetailKind(model.mainActivite);
  const type =
    detailKind === "restauration" && model.activiteDetail === "Destruction de nids d'Hirondelles"
      ? "Hirondelle"
      : detailKind === "transport" && model.activiteDetail === "Destruction de nids de Cigognes"
        ? "Cigogne"
        : null;

  return {
    name: model.name.trim(),
    depot_date: model.depotDate,
    phase: model.phase,
    relations: {
      groupe_instructeurs: model.groupeInstructeurs,
      demandeur_type: isPhysical ? "personne_physique" : "personne_morale",
      demandeur_personne_physique: isPhysical
        ? {
            last_name: lastName,
            first_names: firstNames,
            email: contactEmail,
            address: physicalAddress,
            phone: contactPhone,
            role,
          }
        : null,
      demandeur_personne_morale: isPhysical
        ? null
        : {
            siret: model.legalSiret.replaceAll(" ", ""),
            legal_name: null,
            address: null,
            postal_code: null,
            department: null,
            region: null,
          },
      identites,
    } as AdminDossierCreationPayload["relations"],
    columns: {
      description: nullable(model.description),
      urgent_contact_phone: model.urgentContactPhone.trim(),
      main_activite: model.mainActivite,
      type,
      request_context: requestContext,
      accompaniment_need:
        requestContext === ACCOMPANIMENT_CONTEXT ? nullable(model.accompanimentNeed) : null,
      location_scope: nullable(model.locationScope),
      primary_department: nullable(model.primaryDepartment),
      communes: model.locationScope === "communes" ? communes : [],
      departments,
      regions: model.locationScope === "regions" ? model.locationRegions : [],
      projet_map: model.projectMap,
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
      limited_specimen_type: requiresScientificDemandeType(model.motifDerogation)
        ? nullable(model.limitedSpecimenType)
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
      scientifique_mortality_measures_taken:
        model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité"
          ? model.scientifiqueMortalityMeasuresTaken === "oui"
            ? true
            : model.scientifiqueMortalityMeasuresTaken === "non"
              ? false
              : null
          : null,
      scientifique_mortality_measures_details:
        model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité" &&
        model.scientifiqueMortalityMeasuresTaken === "oui"
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
      intervention_end_date: showsOperationDates(model)
        ? nullable(model.interventionEndDate)
        : null,
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
    },
  };
}
