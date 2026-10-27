import type { Knex } from "knex";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { joinPorteurDeProjet, porteurDeProjetColumns } from "./porteur.ts";

export const dossierFullColumns = [
  "dossier.id as id",
  "demarche_numerique_number",
  "demarche_number",
  "depot_date",
  "ddep_depot_date",
  "dossier.name as name",
  "description",
  "urgent_contact_phone",
  "request_context",
  "accompaniment_need",
  "intervention_start_date",
  "intervention_end_date",
  "intervention_duration",
  "no_other_satisfactory_solution_justification",
  "motif_derogation",
  "motif_derogation_justification",
  "file_especes_impactees.id as especes_impactees_id",
  "file_especes_impactees.name as especes_impactees_name",
  "file_especes_impactees.media_type as especes_impactees_media_type",
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
  "main_activite",
  "activite.code as activite_code",
  "activite.label as activite_label",
  "source",
  "departments",
  "communes",
  "regions",
  "location_scope",
  "primary_department",
  "projet_map",
  "next_action_expected_from",
  "next_due_date",
  "ddep_required",
  "scientifique_demande_type",
  "scientifique_previous_assessment",
  "scientifique_demande_purposes",
  "scientifique_suivi_protocol_description",
  "scientifique_capture_mode",
  "scientifique_light_source_conditions",
  "scientifique_marking_conditions",
  "scientifique_transport_conditions",
  "scientifique_intervention_perimeter",
  "scientifique_intervenants",
  "scientifique_other_intervenants_details",
  "enjeu",
  "free_comment",
  "onagre_demande_identifier",
  "public_consultation_start_date",
  "public_consultation_end_date",
  "mesures_erc_planned",
  "er_mesures_sufficient",
  "dossier_oiseau_simple_compensated_nids_count",
  "dossier_oiseau_simple_destroyed_nids_count",
  "dossier.type as type",
  "ecological_inventory_completed",
  "especes_present_in_influence_area",
  "risk_despite_erc_mesures",
  "commissioning_date",
  ...porteurDeProjetColumns,
] as (keyof DossierFull)[];

export function joinDossierIdentities<T extends Knex.QueryBuilder>(query: T): T {
  joinPorteurDeProjet(query)
    .leftJoin("file as file_especes_impactees", {
      "file_especes_impactees.id": "dossier.especes_impactees",
    })
    // Only reviewed labels resolve to an activity; labels pending review keep their raw display
    // through the fallback in `withResolvedActivite`.
    .leftJoin("activite_label", function () {
      this.on("activite_label.label", "dossier.main_activite").andOnVal(
        "activite_label.needs_review",
        false,
      );
    })
    .leftJoin("activite", { "activite.code": "activite_label.activite_code" });
  return query;
}
