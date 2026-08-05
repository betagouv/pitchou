import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.jsonb("ae_procedures");
    table.text("ae_other_procedure");
    table.text("especes_prise_detention_limitee_type");
    table.boolean("scientifique_mortality_measures_taken");
    table.text("scientifique_mortality_measures_details");
    table.integer("eolien_commissioning_year");
    table.integer("eolien_turbines_count");
    table.float("eolien_tip_height");
    table.float("eolien_rotor_diameter");
    table.float("eolien_ground_clearance");
    table.integer("eolien_monitored_turbines_count");
    table.text("eolien_field_inventory_period");
    table.integer("eolien_monitoring_visits_count");
    table.integer("eolien_weekly_monitoring_visits_count");
    table.jsonb("eolien_mortality_actions");
    table.text("eolien_carcass_collection_method");
    table.text("eolien_carcass_preservation_method");
    table.text("eolien_carcass_examination_address");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumns(
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
    );
  });
}
