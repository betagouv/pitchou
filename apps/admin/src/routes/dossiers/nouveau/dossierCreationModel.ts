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
  scientifiqueCaptureModeOptions,
  requiresSpeciesFile,
  restaurationMainActivite,
  restaurationDemandeOptions,
  transportDemandeOptions,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";

import type {
  AdminDossierCreationPayload,
  AdminDossierDetail,
} from "$lib/actions/adminDossiers.ts";
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

const detailText = (value: unknown) => (typeof value === "string" ? value : "");
const detailNumber = (value: unknown) => (typeof value === "number" ? value : null);
const detailDate = (value: unknown) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value.slice(0, 10) : "";
const detailStrings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function createDossierCreationModelFromDetail(
  detail: AdminDossierDetail,
): DossierCreationModel {
  const model = createDossierCreationModel();
  const dossier = detail.dossier;
  const mainActivite = detailText(dossier.main_activite) as MainActivite;
  const type = detailText(dossier.type);
  const demandeurIdentity = detail.identites.find(({ type }) => type === "demandeur");
  const representative =
    detail.identites.find(({ type }) => type === "representant") ?? demandeurIdentity;
  const captureModes = detailStrings(dossier.scientifique_capture_mode);
  const knownCaptureModes = captureModes.filter((value) =>
    scientifiqueCaptureModeOptions.includes(value as never),
  );
  const otherCaptureMode = captureModes.find(
    (value) => !scientifiqueCaptureModeOptions.includes(value as never),
  );

  model.name = detailText(dossier.name);
  model.urgentContactPhone = detailText(dossier.urgent_contact_phone);
  model.mainActivite = mainActivite;
  model.activiteDetail =
    mainActivite === restaurationMainActivite
      ? type === "Hirondelle"
        ? restaurationDemandeOptions[0]
        : restaurationDemandeOptions[1]
      : transportMainActivites.includes(mainActivite as never)
        ? type === "Cigogne"
          ? transportDemandeOptions[0]
          : transportDemandeOptions[1]
        : "";
  model.requestContext = detailText(dossier.request_context);
  model.accompanimentNeed = detailText(dossier.accompaniment_need);

  if (detail.demandeur_personne_morale) {
    model.demandeurType = "personne_morale";
    model.legalSiret = detail.demandeur_personne_morale.siret;
    model.representativeLastName = representative?.last_name ?? "";
    model.representativeFirstNames = representative?.first_names ?? "";
    model.representativeRole = representative?.role ?? "";
    model.contactPhone = representative?.phone ?? "";
    model.contactEmail = representative?.email ?? "";
  } else {
    const demandeur = detail.demandeur_personne_physique;
    model.demandeurType = "personne_physique";
    model.physicalLastName = demandeur?.last_name ?? "";
    model.physicalFirstNames = demandeur?.first_names ?? "";
    model.physicalQualification = demandeur?.role ?? "";
    model.physicalAddress = demandeur?.address ?? "";
    model.contactPhone = demandeur?.phone ?? "";
    model.contactEmail = demandeur?.email ?? demandeurIdentity?.email ?? "";
  }

  model.primaryDepartment = detailText(dossier.primary_department);
  model.locationScope = detailText(dossier.location_scope) as DossierCreationModel["locationScope"];
  model.communes = Array.isArray(dossier.communes)
    ? (dossier.communes.filter(
        (commune): commune is CreationCommune =>
          !!commune && typeof commune === "object" && typeof commune.name === "string",
      ) as CreationCommune[])
    : [];
  model.locationDepartments = detailStrings(dossier.departments);
  model.locationRegions = detailStrings(dossier.regions);
  model.projectMap =
    dossier.projet_map &&
    typeof dossier.projet_map === "object" &&
    (dossier.projet_map as { type?: unknown }).type === "FeatureCollection"
      ? (dossier.projet_map as CreationProjectMap)
      : null;

  model.noOtherSatisfactorySolutionJustification = detailText(
    dossier.no_other_satisfactory_solution_justification,
  );
  model.motifDerogation = detailText(dossier.motif_derogation);
  model.motifDerogationJustification = detailText(dossier.motif_derogation_justification);
  model.scientifiqueDemandeType = detailStrings(dossier.scientifique_demande_type);
  model.description = detailText(dossier.description);
  model.aeRegime =
    dossier.linked_to_ae_regime === true
      ? "oui"
      : dossier.linked_to_ae_regime === false
        ? "non"
        : "unknown";
  model.aeProcedures = detailStrings(dossier.ae_procedures);
  model.aeOtherProcedure = detailText(dossier.ae_other_procedure);
  model.destroyedNidsCount = detailNumber(dossier.dossier_oiseau_simple_destroyed_nids_count);
  model.limitedSpecimenType = detailText(dossier.limited_specimen_type);
  model.scientifiqueDemandePurposes = detailStrings(dossier.scientifique_demande_purposes);
  model.scientifiquePreviousAssessment =
    dossier.scientifique_previous_assessment === true
      ? "oui"
      : dossier.scientifique_previous_assessment === false
        ? "non"
        : "";
  model.scientifiqueMortalityMeasuresTaken =
    dossier.scientifique_mortality_measures_taken === true
      ? "oui"
      : dossier.scientifique_mortality_measures_taken === false
        ? "non"
        : "";
  model.scientifiqueMortalityMeasuresDetails = detailText(
    dossier.scientifique_mortality_measures_details,
  );
  model.eolienCommissioningYear = detailNumber(dossier.eolien_commissioning_year);
  model.eolienTurbinesCount = detailNumber(dossier.eolien_turbines_count);
  model.eolienTipHeight = detailNumber(dossier.eolien_tip_height);
  model.eolienRotorDiameter = detailNumber(dossier.eolien_rotor_diameter);
  model.eolienGroundClearance = detailNumber(dossier.eolien_ground_clearance);
  model.interventionStartDate = detailDate(dossier.intervention_start_date);
  model.interventionEndDate = detailDate(dossier.intervention_end_date);
  model.commissioningDate = detailDate(dossier.commissioning_date);
  model.interventionDuration = detailNumber(dossier.intervention_duration);
  model.scientifiqueSuiviProtocolDescription = detailText(
    dossier.scientifique_suivi_protocol_description,
  );
  model.eolienMonitoredTurbinesCount = detailNumber(dossier.eolien_monitored_turbines_count);
  model.eolienFieldInventoryPeriod = detailText(dossier.eolien_field_inventory_period);
  model.eolienMonitoringVisitsCount = detailNumber(dossier.eolien_monitoring_visits_count);
  model.eolienWeeklyMonitoringVisitsCount = detailNumber(
    dossier.eolien_weekly_monitoring_visits_count,
  );
  model.eolienMortalityActions = detailStrings(dossier.eolien_mortality_actions);
  model.eolienCarcassCollectionMethod = detailText(dossier.eolien_carcass_collection_method);
  model.eolienCarcassPreservationMethod = detailText(dossier.eolien_carcass_preservation_method);
  model.eolienCarcassExaminationAddress = detailText(dossier.eolien_carcass_examination_address);
  model.scientifiqueCaptureModes = [
    ...knownCaptureModes,
    ...(otherCaptureMode ? ["Autre moyen de capture (préciser)"] : []),
  ];
  model.scientifiqueOtherCaptureMode = otherCaptureMode ?? "";
  model.scientifiqueLightSourceConditions = detailText(
    dossier.scientifique_light_source_conditions,
  );
  model.scientifiqueUsesLightSources = model.scientifiqueLightSourceConditions ? "oui" : "";
  model.scientifiqueMarkingConditions = detailText(dossier.scientifique_marking_conditions);
  model.scientifiqueTransportConditions = detailText(dossier.scientifique_transport_conditions);
  model.scientifiqueIntervenants = Array.isArray(dossier.scientifique_intervenants)
    ? dossier.scientifique_intervenants
        .filter((value) => !!value && typeof value === "object")
        .map((value) => {
          const intervenant = value as Record<string, unknown>;
          return {
            nom_complet: detailText(intervenant.nom_complet),
            qualification: detailText(intervenant.qualification),
            cvFiles: [] as File[],
          };
        })
    : [];
  if (model.scientifiqueIntervenants.length === 0) {
    model.scientifiqueIntervenants = [{ nom_complet: "", qualification: "", cvFiles: [] }];
  }
  model.scientifiqueOtherIntervenantsDetails = detailText(
    dossier.scientifique_other_intervenants_details,
  );
  model.compensatedNidsCount = detailNumber(dossier.dossier_oiseau_simple_compensated_nids_count);
  model.depotDate = detailDate(dossier.depot_date);
  model.phase = detail.phase;
  model.groupeInstructeurs = detail.groupe?.id ?? "";
  return model;
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
      main_activite: nullable(model.mainActivite),
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
