import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { isDossierSource, type DossierSource } from "@pitchou/types/dossierSource.ts";
import type {
  default as Dossier,
  DossierId,
  DossierMutator,
} from "@pitchou/types/database/public/Dossier.ts";
import { DossierNotFoundError } from "./errors.ts";

export const APP_NATIVE_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  "free_comment",
  "next_action_expected_from",
  "onagre_demande_identifier",
  "enjeu",
  "ddep_required",
  "er_mesures_sufficient",
  "public_consultation_start_date",
  "public_consultation_end_date",
  "urgent_contact_phone",
  "request_context",
  "accompaniment_need",
]);
export const DN_DERIVED_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  "name",
  "description",
  "depot_date",
  "main_activite",
  "type",
  "intervention_start_date",
  "intervention_end_date",
  "commissioning_date",
  "intervention_duration",
  "communes",
  "departments",
  "regions",
  "location_scope",
  "primary_department",
  "projet_map",
  "linked_to_ae_regime",
  "ae_procedures",
  "ae_other_procedure",
  "especes_prise_detention_limitee_type",
  "scientifique_mortality_measures_taken",
  "scientifique_mortality_measures_details",
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
  "mesures_erc_planned",
  "ecological_inventory_completed",
  "especes_present_in_influence_area",
  "risk_despite_erc_mesures",
  "no_other_satisfactory_solution_justification",
  "motif_derogation",
  "motif_derogation_justification",
  "dossier_oiseau_simple_destroyed_nids_count",
  "dossier_oiseau_simple_compensated_nids_count",
  "scientifique_demande_type",
  "scientifique_demande_purposes",
  "scientifique_previous_assessment",
  "scientifique_suivi_protocol_description",
  "scientifique_capture_mode",
  "scientifique_light_source_conditions",
  "scientifique_marking_conditions",
  "scientifique_transport_conditions",
  "scientifique_intervention_perimeter",
  "scientifique_intervenants",
  "scientifique_other_intervenants_details",
]);
export const ADMIN_EDITABLE_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  ...APP_NATIVE_DOSSIER_COLUMNS,
  ...DN_DERIVED_DOSSIER_COLUMNS,
]);
export function assertEditableDossierColumns(columns: DossierMutator | undefined): void {
  const unknown = Object.keys(columns ?? {}).filter(
    (key) => !ADMIN_EDITABLE_DOSSIER_COLUMNS.has(key as keyof Dossier),
  );
  if (unknown.length) throw new TypeError(`Non-editable dossier columns: ${unknown.join(", ")}`);
}
export async function getDossierSyncStatus(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ source: DossierSource; managedByDn: boolean; createdInPitchou: boolean }> {
  const dossier = await databaseConnection("dossier")
    .select("source")
    .where({ id: dossierId })
    .first();
  if (!dossier) throw new DossierNotFoundError(dossierId);
  const source: DossierSource = isDossierSource(dossier.source) ? dossier.source : "unknown";
  return {
    source,
    managedByDn: source === "demarche_numerique",
    createdInPitchou: source === "pitchou",
  };
}
