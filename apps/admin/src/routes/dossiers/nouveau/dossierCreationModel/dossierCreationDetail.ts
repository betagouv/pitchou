import {
  restaurationDemandeOptions,
  restaurationMainActivite,
  scientifiqueCaptureModeOptions,
  transportDemandeOptions,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
import {
  createDossierCreationModel,
  type CreationCommune,
  type CreationProjectMap,
  type DossierCreationModel,
  type MainActivite,
} from "./dossierCreationState.ts";

const detailText = (value: unknown) => (typeof value === "string" ? value : "");
const detailNumber = (value: unknown) => (typeof value === "number" ? value : null);
const detailDate = (value: unknown) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value.slice(0, 10) : "";
const detailStrings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function hydrateDemandeur(model: DossierCreationModel, detail: AdminDossierDetail) {
  const demandeurIdentity = detail.identites.find(({ type }) => type === "demandeur");
  const representative =
    detail.identites.find(({ type }) => type === "representant") ?? demandeurIdentity;
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
}

function hydrateScientificDetails(
  model: DossierCreationModel,
  dossier: AdminDossierDetail["dossier"],
) {
  const captureModes = detailStrings(dossier.scientifique_capture_mode);
  const knownCaptureModes = captureModes.filter((value) =>
    scientifiqueCaptureModeOptions.includes(value as never),
  );
  const otherCaptureMode = captureModes.find(
    (value) => !scientifiqueCaptureModeOptions.includes(value as never),
  );
  model.scientifiqueDemandeType = detailStrings(dossier.scientifique_demande_type);
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
  model.scientifiqueSuiviProtocolDescription = detailText(
    dossier.scientifique_suivi_protocol_description,
  );
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
}

export function createDossierCreationModelFromDetail(
  detail: AdminDossierDetail,
): DossierCreationModel {
  const model = createDossierCreationModel();
  const dossier = detail.dossier;
  const mainActivite = detailText(dossier.main_activite) as MainActivite;
  const type = detailText(dossier.type);
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
  hydrateDemandeur(model, detail);
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
  model.especesPriseDetentionLimiteeType = detailText(dossier.especes_prise_detention_limitee_type);
  hydrateScientificDetails(model, dossier);
  model.eolienCommissioningYear = detailNumber(dossier.eolien_commissioning_year);
  model.eolienTurbinesCount = detailNumber(dossier.eolien_turbines_count);
  model.eolienTipHeight = detailNumber(dossier.eolien_tip_height);
  model.eolienRotorDiameter = detailNumber(dossier.eolien_rotor_diameter);
  model.eolienGroundClearance = detailNumber(dossier.eolien_ground_clearance);
  model.interventionStartDate = detailDate(dossier.intervention_start_date);
  model.interventionEndDate = detailDate(dossier.intervention_end_date);
  model.commissioningDate = detailDate(dossier.commissioning_date);
  model.interventionDuration = detailNumber(dossier.intervention_duration);
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
  model.compensatedNidsCount = detailNumber(dossier.dossier_oiseau_simple_compensated_nids_count);
  model.depotDate = detailDate(dossier.depot_date);
  model.phase = detail.phase;
  model.groupeInstructeurs = detail.groupe?.id ?? "";
  return model;
}
