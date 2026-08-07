import { error } from "@sveltejs/kit";
import {
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  requiresOperationDates,
  requiresScientificDemandeType,
  requiresScientificPurposes,
  restaurationMainActivite,
  scientifiqueDemandeTypeOptions,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";

const hasValue = (value: unknown) => value !== null && value !== undefined;

export function validateCreationScientific(columns: DossierMutator, raw: Record<string, unknown>) {
  const mainActivite = columns.main_activite as string;
  const requestContext = columns.request_context as string | null;
  const research = requiresScientificDemandeType(columns.motif_derogation);
  const scientificTypes = Array.isArray(raw.scientifique_demande_type)
    ? raw.scientifique_demande_type.filter((value): value is string => typeof value === "string")
    : [];
  const hasPurposes = requiresScientificPurposes(scientificTypes);
  if (hasPurposes && !Array.isArray(raw.scientifique_demande_purposes))
    error(400, `Property 'scientifique_demande_purposes' must be an array.`);
  if (!hasPurposes && columns.scientifique_demande_purposes !== null)
    error(400, `Property 'scientifique_demande_purposes' does not apply.`);
  const wind = mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité";
  const requiresPrevious = research || wind;
  if (requiresPrevious && typeof raw.scientifique_previous_assessment !== "boolean")
    error(400, `Property 'scientifique_previous_assessment' is required.`);
  if (!requiresPrevious && columns.scientifique_previous_assessment !== null)
    error(400, `Property 'scientifique_previous_assessment' does not apply.`);
  if (wind && typeof raw.scientifique_mortality_measures_taken !== "boolean")
    error(400, `Property 'scientifique_mortality_measures_taken' is required.`);
  if (!wind && columns.scientifique_mortality_measures_taken !== null)
    error(400, `Property 'scientifique_mortality_measures_taken' does not apply.`);
  if (
    columns.scientifique_mortality_measures_taken !== true &&
    columns.scientifique_mortality_measures_details !== null
  )
    error(400, `Property 'scientifique_mortality_measures_details' does not apply.`);
  const windFarmValues = [
    columns.eolien_commissioning_year,
    columns.eolien_turbines_count,
    columns.eolien_tip_height,
    columns.eolien_rotor_diameter,
    columns.eolien_ground_clearance,
  ];
  if (wind && windFarmValues.some((value) => hasValue(value) && value! <= 0))
    error(400, `Wind farm numeric properties must be positive.`);
  if (!wind && windFarmValues.some(hasValue))
    error(400, `Wind farm properties do not apply to this application.`);
  const operationDates = requiresOperationDates(mainActivite, requestContext);
  if (
    operationDates &&
    (!(columns.intervention_start_date instanceof Date) ||
      !(columns.intervention_end_date instanceof Date))
  )
    error(400, `Properties 'intervention_start_date' and 'intervention_end_date' are required.`);
  if (
    columns.intervention_start_date instanceof Date &&
    columns.intervention_end_date instanceof Date &&
    columns.intervention_end_date < columns.intervention_start_date
  )
    error(400, `Property 'intervention_end_date' cannot precede 'intervention_start_date'.`);
  if (
    !operationDates &&
    [
      columns.intervention_start_date,
      columns.intervention_end_date,
      columns.commissioning_date,
    ].some(hasValue)
  )
    error(400, `Operation date properties do not apply to this application.`);
  const derogationDuration = requestContext === dossierRequestContextOptions[2];
  if (
    derogationDuration &&
    hasValue(columns.intervention_duration) &&
    columns.intervention_duration! <= 0
  )
    error(400, `Property 'intervention_duration' must be positive.`);
  if (!derogationDuration && hasValue(columns.intervention_duration))
    error(400, `Property 'intervention_duration' does not apply to this application.`);
  const operationDetails = research || wind;
  if (!operationDetails && hasValue(columns.scientifique_suivi_protocol_description))
    error(400, `Property 'scientifique_suivi_protocol_description' does not apply.`);
  const monitoringValues = [
    columns.eolien_monitored_turbines_count,
    columns.eolien_monitoring_visits_count,
    columns.eolien_weekly_monitoring_visits_count,
  ];
  if (wind && monitoringValues.some((value) => hasValue(value) && value! <= 0))
    error(400, `Wind monitoring count properties must be positive.`);
  if (
    !wind &&
    [
      ...monitoringValues,
      columns.eolien_field_inventory_period,
      columns.eolien_mortality_actions,
    ].some(hasValue)
  )
    error(400, `Wind monitoring properties do not apply to this application.`);
  const mortalityActions = Array.isArray(raw.eolien_mortality_actions)
    ? raw.eolien_mortality_actions
    : [];
  const carcass = wind && mortalityActions.includes(eolienMortalityActionOptions[1]);
  if (
    !carcass &&
    [
      columns.eolien_carcass_collection_method,
      columns.eolien_carcass_preservation_method,
      columns.eolien_carcass_examination_address,
    ].some(hasValue)
  )
    error(400, `Carcass analysis properties do not apply to this application.`);
  const capture =
    research &&
    scientificTypes.some((value) =>
      scientifiqueDemandeTypeOptions.slice(0, 3).includes(value as never),
    );
  if (
    !capture &&
    [
      columns.scientifique_capture_mode,
      columns.scientifique_light_source_conditions,
      columns.scientifique_marking_conditions,
      columns.scientifique_transport_conditions,
    ].some(hasValue)
  )
    error(400, `Scientific method properties do not apply to this application.`);
  if (
    capture &&
    !scientificTypes.includes(scientifiqueDemandeTypeOptions[1]) &&
    columns.scientifique_marking_conditions != null
  )
    error(400, `Property 'scientifique_marking_conditions' does not apply.`);
  if (
    capture &&
    !scientificTypes.includes(scientifiqueDemandeTypeOptions[2]) &&
    columns.scientifique_transport_conditions != null
  )
    error(400, `Property 'scientifique_transport_conditions' does not apply.`);
  if (
    !operationDetails &&
    [columns.scientifique_intervenants, columns.scientifique_other_intervenants_details].some(
      hasValue,
    )
  )
    error(400, `Scientific intervenant properties do not apply to this application.`);
  const compensation =
    (mainActivite === restaurationMainActivite && columns.type === "Hirondelle") ||
    (transportMainActivites.includes(mainActivite as never) && columns.type === "Cigogne");
  if (
    compensation &&
    (typeof columns.dossier_oiseau_simple_compensated_nids_count !== "number" ||
      columns.dossier_oiseau_simple_compensated_nids_count < 1)
  )
    error(400, `Property 'dossier_oiseau_simple_compensated_nids_count' is required.`);
  if (!compensation && hasValue(columns.dossier_oiseau_simple_compensated_nids_count))
    error(400, `Property 'dossier_oiseau_simple_compensated_nids_count' does not apply.`);
}
