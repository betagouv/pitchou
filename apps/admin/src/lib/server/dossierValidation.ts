import { error } from "@sveltejs/kit";

import { phases } from "@pitchou/common/phases.ts";
import {
  dossierMainActivitesWithoutRequestContext,
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  requiresSpeciesFile,
  requiresScientificDemandeType,
  requiresScientificPurposes,
  scientifiqueDemandeTypeOptions,
  restaurationMainActivite,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";
import {
  DossierManagedByDnError,
  DossierNotFoundError,
  type AdminDossierCreation,
  type AdminDossierUpdate,
  type AdminPhaseEvent,
} from "@pitchou/server/database/dossier_admin.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { AdminDossierRelations } from "@pitchou/server/database/dossier_admin_relations.ts";

import { parseColumns } from "./dossierColumnValidation";
import { parseDossierRelations } from "./dossierRelationsValidation";
import { rejectUnknownProperties } from "./requestValidation";

export function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) error(400, "Invalid dossierId.");
  return id as DossierId;
}

function parseDate(property: string, raw: unknown): Date {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
    error(400, `Property '${property}' must be a valid date.`);
  }
  return new Date(raw);
}

function parsePhase(raw: unknown): DossierPhase {
  if (typeof raw !== "string" || !phases.has(raw as DossierPhase)) {
    error(400, `Property 'phase' is invalid.`);
  }
  return raw as DossierPhase;
}

function parsePhaseEvents(raw: unknown): AdminPhaseEvent[] {
  if (!Array.isArray(raw)) error(400, `Property 'evenementsPhase' must be an array.`);
  return raw.map((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      error(400, "Each phase event must be an object.");
    }
    const value = event as Record<string, unknown>;
    rejectUnknownProperties(value, new Set(["phase", "timestamp"]));
    return {
      phase: parsePhase(value.phase),
      timestamp: parseDate("timestamp", value.timestamp),
    };
  });
}

const CREATION_PROPERTIES = new Set(["name", "depot_date", "phase", "relations", "columns"]);
const MAIN_ACTIVITES_WITHOUT_CONTEXT = new Set<string>(dossierMainActivitesWithoutRequestContext);

function parseCreationColumns(raw: unknown): DossierMutator {
  if (raw === undefined) error(400, `Property 'columns' is required.`);
  const columns = parseColumns(raw);
  const phone = columns.urgent_contact_phone;
  if (typeof phone !== "string" || !isValidPhone(phone)) {
    error(400, `Property 'urgent_contact_phone' must be a valid phone number.`);
  }

  const mainActivite = columns.main_activite;
  if (typeof mainActivite !== "string") {
    error(400, `Property 'main_activite' is required.`);
  }
  const displaysContext = !MAIN_ACTIVITES_WITHOUT_CONTEXT.has(mainActivite);
  const requestContext = columns.request_context;
  if (displaysContext && typeof requestContext !== "string") {
    error(400, `Property 'request_context' is required for this main activity.`);
  }
  if (!displaysContext && requestContext !== null) {
    error(400, `Property 'request_context' does not apply to this main activity.`);
  }
  if (
    requestContext === dossierRequestContextOptions[0] &&
    (typeof columns.accompaniment_need !== "string" || !columns.accompaniment_need.trim())
  ) {
    error(400, `Property 'accompaniment_need' is required for upstream support.`);
  }
  if (requestContext !== dossierRequestContextOptions[0] && columns.accompaniment_need !== null) {
    error(400, `Property 'accompaniment_need' does not apply to this request context.`);
  }

  const requiresActivityDetail =
    mainActivite === restaurationMainActivite ||
    transportMainActivites.includes(mainActivite as (typeof transportMainActivites)[number]);
  if (requiresActivityDetail && !(raw && typeof raw === "object" && Object.hasOwn(raw, "type"))) {
    error(400, `Property 'type' is required for this main activity.`);
  }
  if (
    mainActivite === restaurationMainActivite &&
    columns.type !== null &&
    columns.type !== "Hirondelle"
  ) {
    error(400, `Property 'type' is invalid for this main activity.`);
  }
  if (
    transportMainActivites.includes(mainActivite as (typeof transportMainActivites)[number]) &&
    columns.type !== null &&
    columns.type !== "Cigogne"
  ) {
    error(400, `Property 'type' is invalid for this main activity.`);
  }
  if (!requiresActivityDetail && columns.type !== null) {
    error(400, `Property 'type' does not apply to this main activity.`);
  }

  if (typeof columns.location_scope !== "string") {
    error(400, `Property 'location_scope' is required.`);
  }
  if (typeof columns.primary_department !== "string") {
    error(400, `Property 'primary_department' is required.`);
  }
  const rawColumns = raw as Record<string, unknown>;
  if (columns.location_scope === "communes" && !Array.isArray(rawColumns.communes)) {
    error(400, `Property 'communes' is required for the commune location scope.`);
  }
  if (columns.location_scope === "regions" && !Array.isArray(rawColumns.regions)) {
    error(400, `Property 'regions' is required for the region location scope.`);
  }

  const requiresJustification = requiresSpeciesFile(mainActivite, requestContext as string | null);
  if (requiresJustification) {
    if (
      typeof columns.no_other_satisfactory_solution_justification !== "string" ||
      !columns.no_other_satisfactory_solution_justification.trim()
    ) {
      error(400, `Property 'no_other_satisfactory_solution_justification' is required.`);
    }
    if (typeof columns.motif_derogation !== "string") {
      error(400, `Property 'motif_derogation' is required.`);
    }
    if (
      typeof columns.motif_derogation_justification !== "string" ||
      !columns.motif_derogation_justification.trim()
    ) {
      error(400, `Property 'motif_derogation_justification' is required.`);
    }
  } else if (
    columns.no_other_satisfactory_solution_justification !== null ||
    columns.motif_derogation !== null ||
    columns.motif_derogation_justification !== null
  ) {
    error(400, `Derogation justification properties do not apply to this application.`);
  }
  if (requiresScientificDemandeType(columns.motif_derogation)) {
    if (
      !Array.isArray(rawColumns.scientifique_demande_type) ||
      rawColumns.scientifique_demande_type.length === 0
    ) {
      error(400, `Property 'scientifique_demande_type' requires at least one value.`);
    }
  } else if (columns.scientifique_demande_type !== null) {
    error(400, `Property 'scientifique_demande_type' does not apply to this derogation reason.`);
  }

  if (typeof columns.description !== "string" || !columns.description.trim()) {
    error(400, `Property 'description' is required.`);
  }
  if (
    typeof rawColumns.linked_to_ae_regime !== "boolean" &&
    rawColumns.linked_to_ae_regime !== "unknown"
  ) {
    error(400, `Property 'linked_to_ae_regime' is required.`);
  }
  if (rawColumns.linked_to_ae_regime === true) {
    if (!Array.isArray(rawColumns.ae_procedures) || rawColumns.ae_procedures.length === 0) {
      error(400, `Property 'ae_procedures' requires at least one value.`);
    }
    if (
      rawColumns.ae_procedures.includes("Autre") &&
      (typeof columns.ae_other_procedure !== "string" || !columns.ae_other_procedure.trim())
    ) {
      error(400, `Property 'ae_other_procedure' is required.`);
    }
  } else if (columns.ae_procedures !== null || columns.ae_other_procedure !== null) {
    error(400, `AE procedure properties do not apply to this application.`);
  }

  const requiresDestroyedNidsCount =
    mainActivite === restaurationMainActivite && columns.type === "Hirondelle";
  if (
    requiresDestroyedNidsCount &&
    (typeof columns.dossier_oiseau_simple_destroyed_nids_count !== "number" ||
      columns.dossier_oiseau_simple_destroyed_nids_count < 1)
  ) {
    error(400, `Property 'dossier_oiseau_simple_destroyed_nids_count' is required.`);
  }
  if (!requiresDestroyedNidsCount && columns.dossier_oiseau_simple_destroyed_nids_count !== null) {
    error(400, `Property 'dossier_oiseau_simple_destroyed_nids_count' does not apply.`);
  }

  const researchReason = requiresScientificDemandeType(columns.motif_derogation);
  if (researchReason && typeof columns.limited_specimen_type !== "string") {
    error(400, `Property 'limited_specimen_type' is required.`);
  }
  if (!researchReason && columns.limited_specimen_type !== null) {
    error(400, `Property 'limited_specimen_type' does not apply.`);
  }

  const scientificTypes = Array.isArray(rawColumns.scientifique_demande_type)
    ? rawColumns.scientifique_demande_type.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const hasScientificPurposes = requiresScientificPurposes(scientificTypes);
  if (hasScientificPurposes && !Array.isArray(rawColumns.scientifique_demande_purposes)) {
    error(400, `Property 'scientifique_demande_purposes' must be an array.`);
  }
  if (!hasScientificPurposes && columns.scientifique_demande_purposes !== null) {
    error(400, `Property 'scientifique_demande_purposes' does not apply.`);
  }

  const windMortality =
    mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité";
  const requiresPreviousAssessment = researchReason || windMortality;
  if (
    requiresPreviousAssessment &&
    typeof rawColumns.scientifique_previous_assessment !== "boolean"
  ) {
    error(400, `Property 'scientifique_previous_assessment' is required.`);
  }
  if (!requiresPreviousAssessment && columns.scientifique_previous_assessment !== null) {
    error(400, `Property 'scientifique_previous_assessment' does not apply.`);
  }
  if (windMortality && typeof rawColumns.scientifique_mortality_measures_taken !== "boolean") {
    error(400, `Property 'scientifique_mortality_measures_taken' is required.`);
  }
  if (!windMortality && columns.scientifique_mortality_measures_taken !== null) {
    error(400, `Property 'scientifique_mortality_measures_taken' does not apply.`);
  }
  if (
    columns.scientifique_mortality_measures_taken !== true &&
    columns.scientifique_mortality_measures_details !== null
  ) {
    error(400, `Property 'scientifique_mortality_measures_details' does not apply.`);
  }
  const windFarmValues = [
    columns.eolien_commissioning_year,
    columns.eolien_turbines_count,
    columns.eolien_tip_height,
    columns.eolien_rotor_diameter,
    columns.eolien_ground_clearance,
  ];
  if (
    windMortality &&
    windFarmValues.some((value) => value !== null && value !== undefined && value <= 0)
  ) {
    error(400, `Wind farm numeric properties must be positive.`);
  }
  if (!windMortality && windFarmValues.some((value) => value !== null && value !== undefined)) {
    error(400, `Wind farm properties do not apply to this application.`);
  }
  const showsOperationDates =
    requestContext === dossierRequestContextOptions[1] ||
    requestContext === dossierRequestContextOptions[2];
  if (
    showsOperationDates &&
    (!(columns.intervention_start_date instanceof Date) ||
      !(columns.intervention_end_date instanceof Date))
  ) {
    error(400, `Properties 'intervention_start_date' and 'intervention_end_date' are required.`);
  }
  if (
    columns.intervention_start_date instanceof Date &&
    columns.intervention_end_date instanceof Date &&
    columns.intervention_end_date < columns.intervention_start_date
  ) {
    error(400, `Property 'intervention_end_date' cannot precede 'intervention_start_date'.`);
  }
  if (
    !showsOperationDates &&
    [
      columns.intervention_start_date,
      columns.intervention_end_date,
      columns.commissioning_date,
    ].some((value) => value !== null && value !== undefined)
  ) {
    error(400, `Operation date properties do not apply to this application.`);
  }
  const showsDerogationDuration = requestContext === dossierRequestContextOptions[2];
  if (
    showsDerogationDuration &&
    columns.intervention_duration !== null &&
    columns.intervention_duration !== undefined &&
    columns.intervention_duration <= 0
  ) {
    error(400, `Property 'intervention_duration' must be positive.`);
  }
  if (
    !showsDerogationDuration &&
    columns.intervention_duration !== null &&
    columns.intervention_duration !== undefined
  ) {
    error(400, `Property 'intervention_duration' does not apply to this application.`);
  }
  const showsOperationDetails = researchReason || windMortality;
  if (
    !showsOperationDetails &&
    columns.scientifique_suivi_protocol_description !== null &&
    columns.scientifique_suivi_protocol_description !== undefined
  ) {
    error(400, `Property 'scientifique_suivi_protocol_description' does not apply.`);
  }
  const windMonitoringValues = [
    columns.eolien_monitored_turbines_count,
    columns.eolien_monitoring_visits_count,
    columns.eolien_weekly_monitoring_visits_count,
  ];
  if (
    windMortality &&
    windMonitoringValues.some((value) => value !== null && value !== undefined && value <= 0)
  ) {
    error(400, `Wind monitoring count properties must be positive.`);
  }
  if (
    !windMortality &&
    [
      ...windMonitoringValues,
      columns.eolien_field_inventory_period,
      columns.eolien_mortality_actions,
    ].some((value) => value !== null && value !== undefined)
  ) {
    error(400, `Wind monitoring properties do not apply to this application.`);
  }
  const mortalityActions = Array.isArray(rawColumns.eolien_mortality_actions)
    ? rawColumns.eolien_mortality_actions
    : [];
  const showsCarcassAnalysis =
    windMortality && mortalityActions.includes(eolienMortalityActionOptions[1]);
  if (
    !showsCarcassAnalysis &&
    [
      columns.eolien_carcass_collection_method,
      columns.eolien_carcass_preservation_method,
      columns.eolien_carcass_examination_address,
    ].some((value) => value !== null && value !== undefined)
  ) {
    error(400, `Carcass analysis properties do not apply to this application.`);
  }
  const showsScientificCaptureDetails =
    researchReason &&
    scientificTypes.some((value) =>
      scientifiqueDemandeTypeOptions.slice(0, 3).includes(value as never),
    );
  if (
    !showsScientificCaptureDetails &&
    [
      columns.scientifique_capture_mode,
      columns.scientifique_light_source_conditions,
      columns.scientifique_marking_conditions,
      columns.scientifique_transport_conditions,
    ].some((value) => value !== null && value !== undefined)
  ) {
    error(400, `Scientific method properties do not apply to this application.`);
  }
  if (
    showsScientificCaptureDetails &&
    !scientificTypes.includes(scientifiqueDemandeTypeOptions[1]) &&
    columns.scientifique_marking_conditions != null
  ) {
    error(400, `Property 'scientifique_marking_conditions' does not apply.`);
  }
  if (
    showsScientificCaptureDetails &&
    !scientificTypes.includes(scientifiqueDemandeTypeOptions[2]) &&
    columns.scientifique_transport_conditions != null
  ) {
    error(400, `Property 'scientifique_transport_conditions' does not apply.`);
  }
  if (
    !showsOperationDetails &&
    [columns.scientifique_intervenants, columns.scientifique_other_intervenants_details].some(
      (value) => value !== null && value !== undefined,
    )
  ) {
    error(400, `Scientific intervenant properties do not apply to this application.`);
  }
  const requiresCompensatedNidsCount =
    (mainActivite === restaurationMainActivite && columns.type === "Hirondelle") ||
    (transportMainActivites.includes(mainActivite as (typeof transportMainActivites)[number]) &&
      columns.type === "Cigogne");
  if (
    requiresCompensatedNidsCount &&
    (typeof columns.dossier_oiseau_simple_compensated_nids_count !== "number" ||
      columns.dossier_oiseau_simple_compensated_nids_count < 1)
  ) {
    error(400, `Property 'dossier_oiseau_simple_compensated_nids_count' is required.`);
  }
  if (
    !requiresCompensatedNidsCount &&
    columns.dossier_oiseau_simple_compensated_nids_count !== null &&
    columns.dossier_oiseau_simple_compensated_nids_count !== undefined
  ) {
    error(400, `Property 'dossier_oiseau_simple_compensated_nids_count' does not apply.`);
  }
  return columns;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replaceAll(/\D/g, "");
  return /^\+?[0-9(). -]+$/.test(phone) && digits.length >= 10 && digits.length <= 15;
}

function parseCreationRelations(raw: unknown): AdminDossierRelations {
  const relations = parseDossierRelations(raw);
  if (relations.demandeur_type === "personne_physique") {
    const demandeur = relations.identites.find(({ type }) => type === "demandeur")!;
    if (
      relations.demandeur_personne_physique.last_name.trim() !== demandeur.last_name?.trim() ||
      relations.demandeur_personne_physique.first_names.trim() !== demandeur.first_names?.trim()
    ) {
      error(400, `The physical demandeur and its identity must match.`);
    }
    const phone = relations.demandeur_personne_physique.phone;
    if (phone && !isValidPhone(phone)) {
      error(400, `The physical demandeur phone number must be valid.`);
    }
  } else {
    const representant = relations.identites.find(({ type }) => type === "representant");
    if (!representant) error(400, `A representative identity is required for a legal demandeur.`);
  }
  for (const identity of relations.identites) {
    if (identity.phone && !isValidPhone(identity.phone)) {
      error(400, `Identity phone numbers must be valid.`);
    }
  }
  return relations;
}

export function parseDossierCreation(body: Record<string, unknown>): AdminDossierCreation {
  rejectUnknownProperties(body, CREATION_PROPERTIES);
  if (typeof body.name !== "string" || body.name.trim() === "") {
    error(400, `Property 'name' is required.`);
  }
  return {
    name: body.name.trim(),
    depot_date: parseDate("depot_date", body.depot_date),
    phase: parsePhase(body.phase),
    relations: parseCreationRelations(body.relations),
    columns: parseCreationColumns(body.columns),
  };
}

export function parseDossierUpdate(body: Record<string, unknown>): AdminDossierUpdate {
  rejectUnknownProperties(body, new Set(["columns", "evenementsPhase", "relations"]));
  const update: AdminDossierUpdate = {};
  if (body.columns !== undefined) update.columns = parseColumns(body.columns);
  if (
    update.columns &&
    [
      "eolien_commissioning_year",
      "eolien_turbines_count",
      "eolien_tip_height",
      "eolien_rotor_diameter",
      "eolien_ground_clearance",
      "eolien_monitored_turbines_count",
      "eolien_field_inventory_period",
      "eolien_monitoring_visits_count",
      "eolien_weekly_monitoring_visits_count",
      "eolien_mortality_actions",
      "eolien_carcass_collection_method",
      "eolien_carcass_preservation_method",
      "eolien_carcass_examination_address",
    ].some((column) => column in update.columns!)
  ) {
    error(400, `Wind farm properties can only be set during dossier creation.`);
  }
  if (
    update.columns?.intervention_start_date instanceof Date &&
    update.columns.intervention_end_date instanceof Date &&
    update.columns.intervention_end_date < update.columns.intervention_start_date
  ) {
    error(400, `Property 'intervention_end_date' cannot precede 'intervention_start_date'.`);
  }
  if (body.evenementsPhase !== undefined) {
    update.evenementsPhase = parsePhaseEvents(body.evenementsPhase);
  }
  if (body.relations !== undefined) update.relations = parseDossierRelations(body.relations);
  if (!update.columns && !update.evenementsPhase && !update.relations) {
    error(400, `The body must contain 'columns', 'evenementsPhase', and/or 'relations'.`);
  }
  return update;
}

export function throwHttpErrorForAdminDossier(err: unknown): never {
  if (err instanceof DossierNotFoundError) error(404, err.message);
  if (err instanceof DossierManagedByDnError) error(409, err.message);
  if (err instanceof TypeError) error(400, err.message);
  throw err;
}
