import { ADMIN_EDITABLE_DOSSIER_COLUMNS } from "@pitchou/server/database/dossier_admin.ts";

export type ColumnKind =
  | "string"
  | "boolean"
  | "integer"
  | "date"
  | "stringArray"
  | "communes"
  | "intervenants"
  | "geoJson";

export const COLUMN_KINDS: Record<string, ColumnKind> = {
  name: "string",
  description: "string",
  main_activite: "string",
  type: "string",
  no_other_satisfactory_solution_justification: "string",
  motif_derogation: "string",
  motif_derogation_justification: "string",
  free_comment: "string",
  onagre_demande_identifier: "string",
  next_action_expected_from: "string",
  scientifique_suivi_protocol_description: "string",
  scientifique_light_source_conditions: "string",
  scientifique_marking_conditions: "string",
  scientifique_transport_conditions: "string",
  scientifique_intervention_perimeter: "string",
  scientifique_other_intervenants_details: "string",
  enjeu: "boolean",
  ddep_required: "boolean",
  er_mesures_sufficient: "boolean",
  linked_to_ae_regime: "boolean",
  mesures_erc_planned: "boolean",
  ecological_inventory_completed: "boolean",
  especes_present_in_influence_area: "boolean",
  risk_despite_erc_mesures: "boolean",
  scientifique_previous_assessment: "boolean",
  intervention_duration: "integer",
  dossier_oiseau_simple_destroyed_nids_count: "integer",
  dossier_oiseau_simple_compensated_nids_count: "integer",
  depot_date: "date",
  intervention_start_date: "date",
  intervention_end_date: "date",
  commissioning_date: "date",
  public_consultation_start_date: "date",
  public_consultation_end_date: "date",
  scientifique_demande_type: "stringArray",
  scientifique_demande_purposes: "stringArray",
  scientifique_capture_mode: "stringArray",
  departments: "stringArray",
  regions: "stringArray",
  location_scope: "string",
  communes: "communes",
  scientifique_intervenants: "intervenants",
  projet_map: "geoJson",
};

for (const column of ADMIN_EDITABLE_DOSSIER_COLUMNS) {
  if (!(column in COLUMN_KINDS)) {
    throw new Error(`Missing validation kind for dossier column '${column}'`);
  }
}
