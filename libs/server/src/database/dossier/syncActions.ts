import type { Knex } from "knex";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";

/**
 * Columns the synchronization writes back but that are not facts of the
 * pétitionnaire: identifiers and technical columns, and the annotations owned by
 * the instructeurs, which travel to Démarche Numérique and come back unchanged.
 * Their own historique is written where an instructeur edits them.
 */
const notPetitionnaireColumns: Set<string> = new Set([
  "id",
  "demarche_numerique_id",
  "demarche_numerique_number",
  "demarche_number",
  "source",
  "depot_date",
  "deposant",
  "demandeur_personne_physique",
  // Diffed apart, as an « espèces impactées » entry rather than a champ.
  "especes_impactees",
  // Instruction annotations
  "free_comment",
  "ddep_required",
  "er_mesures_sufficient",
  "onagre_demande_identifier",
  "next_action_expected_from",
  "next_action_expected",
  "next_due_date",
  "enjeu",
  "public_consultation_start_date",
  "public_consultation_end_date",
]);

/**
 * Champ names shown in the historique. A column absent from this map is still
 * diffed — under its column name — so a new champ of the form is never silently
 * left out of the historique.
 */
const columnLabels: Partial<Record<keyof Dossier, string>> = {
  name: "Nom du projet",
  description: "Description",
  main_activite: "Activité principale",
  type: "Type de dossier",
  motif_derogation: "Motif de la dérogation",
  motif_derogation_justification: "Synthèse des éléments justifiant le motif de la dérogation",
  no_other_satisfactory_solution_justification:
    "Synthèse des éléments démontrant qu'il n'existe aucune alternative",
  intervention_start_date: "Date de début d'intervention ou des travaux",
  intervention_end_date: "Date de fin d'intervention ou des travaux",
  intervention_duration: "Durée de la dérogation",
  commissioning_date: "Date de mise en service de l'exploitation",
  communes: "Communes du projet",
  departments: "Départements du projet",
  regions: "Régions du projet",
  location_scope: "Périmètre de localisation",
  primary_department: "Département principal",
  projet_map: "Cartographie du projet",
  ecological_inventory_completed: "État des lieux écologique",
  especes_present_in_influence_area: "Présence d'espèces protégées dans l'aire d'influence",
  risk_despite_erc_mesures: "Risque malgré les mesures d'évitement et de réduction",
  mesures_erc_planned: "Mesures ERC prévues",
  urgent_contact_phone: "Téléphone en cas de demande urgente",
  request_context: "Situation du demandeur",
  accompaniment_need: "Besoin d'accompagnement",
  linked_to_ae_regime: "Rattachement au régime AE",
  ae_procedures: "Procédures de l'autorisation environnementale",
  ae_other_procedure: "Autre procédure de l'autorisation environnementale",
  dossier_oiseau_simple_destroyed_nids_count: "Nombre de nids détruits",
  dossier_oiseau_simple_compensated_nids_count: "Nombre de nids compensés",
  especes_prise_detention_limitee_type: "Type de prise ou détention limitée",
  demandeur_personne_morale: "Entreprise",
  scientifique_demande_type: "Type de demande scientifique",
  scientifique_demande_purposes: "Finalités de la demande scientifique",
  scientifique_previous_assessment: "Bilan des opérations antérieures",
  scientifique_suivi_protocol_description: "Description du protocole de suivi",
  scientifique_capture_mode: "Mode de capture",
  scientifique_light_source_conditions: "Modalités des sources lumineuses",
  scientifique_marking_conditions: "Modalités de marquage",
  scientifique_transport_conditions: "Modalités de transport",
  scientifique_intervention_perimeter: "Périmètre d'intervention",
  scientifique_intervenants: "Intervenants",
  scientifique_other_intervenants_details: "Précisions sur les autres intervenants",
  scientifique_mortality_measures_taken: "Mesures prises en cas de mortalité",
  scientifique_mortality_measures_details: "Précisions sur les mesures de mortalité",
  eolien_commissioning_year: "Année de mise en service du parc éolien",
  eolien_turbines_count: "Nombre d'éoliennes",
  eolien_tip_height: "Hauteur en bout de pale",
  eolien_rotor_diameter: "Diamètre du rotor",
  eolien_ground_clearance: "Garde au sol",
  eolien_monitored_turbines_count: "Nombre d'éoliennes suivies",
  eolien_field_inventory_period: "Période d'inventaire de terrain",
  eolien_monitoring_visits_count: "Nombre de visites de suivi",
  eolien_weekly_monitoring_visits_count: "Nombre de visites hebdomadaires",
  eolien_mortality_actions: "Actions en cas de mortalité",
  eolien_carcass_collection_method: "Méthode de collecte des cadavres",
  eolien_carcass_preservation_method: "Méthode de conservation des cadavres",
  eolien_carcass_examination_address: "Adresse d'examen des cadavres",
};

/**
 * The calendar day a Date stands for, in the zone the process runs in. Postgres
 * returns a `date` column as local midnight while Démarche Numérique sends the
 * same day as a "YYYY-MM-DD" string: rendering the Date in UTC would move it to
 * the day before in any positive offset, and every synchronization would then
 * report an unchanged date as modified.
 */
function toLocalDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return toLocalDay(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Long texts and maps are kept as an excerpt: the historique shows a change, not a diff. */
function excerpt(value: unknown): string | null {
  const text = normalize(value);
  if (!text) return null;
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export type SyncActionsResult = {
  actions: ActionDossierInitializer[];
  /** Dossiers whose pétitionnaire data actually changed, to notify their followers. */
  changedDossiers: Set<DossierId>;
};

/**
 * Diffs the dossiers the synchronization is about to update against their current
 * rows. Every column carried by the update is compared, except the ones above, so
 * the historique records exactly which champs the pétitionnaire changed instead of
 * flagging the whole dossier as modified.
 */
export async function actionsFromSyncUpdates(
  dossiersForUpdate: DossierForUpdate[],
  db: Knex.Transaction | Knex,
): Promise<SyncActionsResult> {
  const empty: SyncActionsResult = { actions: [], changedDossiers: new Set() };
  if (dossiersForUpdate.length === 0) return empty;

  const numbers = dossiersForUpdate
    .map(({ dossier }) => dossier.demarche_numerique_number)
    .filter((number) => number != null);
  if (numbers.length === 0) return empty;

  const comparedColumns = new Set(
    dossiersForUpdate.flatMap(({ dossier }) =>
      Object.keys(dossier).filter((column) => !notPetitionnaireColumns.has(column)),
    ),
  );

  const currentRows: Partial<Dossier>[] = await db("dossier")
    .select([
      "id",
      "demarche_numerique_number",
      "especes_impactees",
      ...[...comparedColumns].map((column) => `dossier.${column}`),
    ])
    .whereIn("demarche_numerique_number", numbers)
    .where("source", "demarche_numerique");
  const currentByNumber = new Map(currentRows.map((row) => [row.demarche_numerique_number, row]));

  const actions: ActionDossierInitializer[] = [];
  const changedDossiers = new Set<DossierId>();
  for (const { dossier: update } of dossiersForUpdate) {
    const current = currentByNumber.get(update.demarche_numerique_number ?? undefined);
    if (!current?.id) continue;

    for (const column of Object.keys(update) as (keyof Dossier)[]) {
      if (notPetitionnaireColumns.has(column)) continue;
      const before = current[column];
      const after = update[column];
      if (normalize(after) === normalize(before)) continue;
      actions.push({
        dossier: current.id,
        type: "champ_modifie",
        data: {
          field: columnLabels[column] ?? column,
          from: excerpt(before),
          to: excerpt(after),
        },
        author_petitionnaire: true,
      });
      changedDossiers.add(current.id);
    }

    if (
      "especes_impactees" in update &&
      normalize(update.especes_impactees) !== normalize(current.especes_impactees)
    ) {
      actions.push({
        dossier: current.id,
        type: "especes_renseignees",
        data: {},
        author_petitionnaire: true,
      });
      changedDossiers.add(current.id);
    }
  }
  return { actions, changedDossiers };
}
