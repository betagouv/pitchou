import type {
  AdditionalDataForDossierCreation,
  DossierForInsert,
  PersonneWithRequiredEmail,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";

const dossierColumnRenames = {
  id_demarches_simplifiées: "demarche_numerique_id",
  date_dépôt: "depot_date",
  départements: "departments",
  déposant: "deposant",
  régions: "regions",
  nom: "name",
  number_demarches_simplifiées: "demarche_numerique_number",
  ddep_nécessaire: "ddep_required",
  commentaire_libre: "free_comment",
  historique_identifiant_demande_onagre: "onagre_demande_identifier",
  date_debut_consultation_public: "public_consultation_start_date",
  rattaché_au_régime_ae: "linked_to_ae_regime",
  prochaine_action_attendue_par: "next_action_expected_from",
  activité_principale: "main_activite",
  espèces_impactées: "especes_impactees",
  date_début_intervention: "intervention_start_date",
  date_fin_intervention: "intervention_end_date",
  durée_intervention: "intervention_duration",
  scientifique_type_demande: "scientifique_demande_type",
  scientifique_description_protocole_suivi: "scientifique_suivi_protocol_description",
  scientifique_mode_capture: "scientifique_capture_mode",
  scientifique_modalités_source_lumineuses: "scientifique_light_source_conditions",
  scientifique_modalités_marquage: "scientifique_marking_conditions",
  scientifique_modalités_transport: "scientifique_transport_conditions",
  scientifique_périmètre_intervention: "scientifique_intervention_perimeter",
  scientifique_précisions_autres_intervenants: "scientifique_other_intervenants_details",
  justification_absence_autre_solution_satisfaisante:
    "no_other_satisfactory_solution_justification",
  motif_dérogation: "motif_derogation",
  justification_motif_dérogation: "motif_derogation_justification",
  mesures_erc_prévues: "mesures_erc_planned",
  scientifique_bilan_antérieur: "scientifique_previous_assessment",
  scientifique_finalité_demande: "scientifique_demande_purposes",
  nombre_nids_détruits_dossier_oiseau_simple: "dossier_oiseau_simple_destroyed_nids_count",
  nombre_nids_compensés_dossier_oiseau_simple: "dossier_oiseau_simple_compensated_nids_count",
  numéro_démarche: "demarche_number",
  etat_des_lieux_ecologique_complet_realise: "ecological_inventory_completed",
  presence_especes_dans_aire_influence: "especes_present_in_influence_area",
  risque_malgre_mesures_erc: "risk_despite_erc_mesures",
  date_fin_consultation_public: "public_consultation_end_date",
  mesures_er_suffisantes: "er_mesures_sufficient",
  date_mise_en_service: "commissioning_date",
  cartographie_projet: "projet_map",
} as const;

function renameProperties(
  value: unknown,
  renames: Readonly<Record<string, string>>,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, propertyValue]) => [renames[key] ?? key, propertyValue]),
  );
}

function renameArrayProperties(
  value: unknown,
  renames: Readonly<Record<string, string>>,
): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => renameProperties(item, renames) ?? {});
}

export function mapPersistedAdditionalData(
  value: AdditionalDataForDossierCreation,
): Partial<DossierForInsert> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const persisted = value as unknown as Record<string, unknown>;
  return {
    dossier: renameProperties(
      persisted.dossier,
      dossierColumnRenames,
    ) as unknown as DossierInitializer,
    evenement_phase_dossier: renameArrayProperties(
      persisted.evenement_phase_dossier ?? persisted["évènement_phase_dossier"],
      {
        horodatage: "timestamp",
        cause_personne: "caused_by_personne",
        DS_emailAgentTraitant: "demarche_numerique_agent_email",
        DS_motivation: "demarche_numerique_motivation",
      },
    ) as PartialBy<EvenementPhaseDossierInitializer, "dossier">[] | undefined,
    decision_administrative: renameArrayProperties(
      persisted.decision_administrative ?? persisted["décision_administrative"],
      {
        numéro: "number",
        date_signature: "signature_date",
        date_fin_obligations: "obligations_end_date",
      },
    ) as PartialBy<DecisionAdministrativeInitializer, "dossier">[] | undefined,
    avis_expert: renameArrayProperties(persisted.avis_expert, {
      date_saisine: "saisine_date",
      date_avis: "avis_date",
    }) as PartialBy<AvisExpertInitializer, "dossier">[] | undefined,
    followers: renameArrayProperties(persisted.followers ?? persisted.personnes_qui_suivent, {
      nom: "last_name",
      prénoms: "first_names",
      code_accès: "access_code",
    }) as PersonneWithRequiredEmail[] | undefined,
  };
}
