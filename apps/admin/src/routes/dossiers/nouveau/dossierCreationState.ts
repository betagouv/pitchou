import { dossierMainActiviteOptions } from "@pitchou/common/dossierFormOptions.ts";

export type CreationCommune = {
  name: string;
  code?: string;
  postalCode?: string;
  departmentCode?: string;
};

export type CreationProjectMap = {
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
export type CompanyDetailsChoice = "" | "keep" | "reset";

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
    especesPriseDetentionLimiteeType: "",
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
