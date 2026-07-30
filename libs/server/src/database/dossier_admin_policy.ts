import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { DossierNotFoundError } from "./dossier_admin_errors.ts";

import type {
  default as Dossier,
  DossierId,
  DossierMutator,
} from "@pitchou/types/database/public/Dossier.ts";

/** Dossier columns owned by Pitchou: editable on every dossier. */
export const APP_NATIVE_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  "free_comment",
  "next_action_expected_from",
  "onagre_demande_identifier",
  "enjeu",
  "ddep_required",
  "er_mesures_sufficient",
  "public_consultation_start_date",
  "public_consultation_end_date",
]);

/** Columns overwritten by the Demarche Numerique sync on every run. */
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
  "projet_map",
  "linked_to_ae_regime",
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
  const unknownKeys = Object.keys(columns ?? {}).filter(
    (key) => !ADMIN_EDITABLE_DOSSIER_COLUMNS.has(key as keyof Dossier),
  );
  if (unknownKeys.length >= 1) {
    throw new TypeError(`Non-editable dossier columns: ${unknownKeys.join(", ")}`);
  }
}

/** Loads whether the dossier was imported by the Demarche Numerique sync. */
export async function getDossierSyncStatus(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ managedByDn: boolean }> {
  const dossier = await databaseConnection("dossier")
    .select("demarche_numerique_number")
    .where({ id: dossierId })
    .first();
  if (!dossier) throw new DossierNotFoundError(dossierId);
  return { managedByDn: dossier.demarche_numerique_number !== null };
}
