import type { default as Dossier, DossierId } from "./database/public/Dossier.ts";
import type { ActionDossierId } from "./database/public/ActionDossier.ts";
import type Entreprise from "./database/public/Entreprise.ts";

export type FieldChange = {
  field: string;
  label: string;
  column?: string;
  revisions: ActionDossierId[];
  detected_at: Date;
  modified_at: Date | null;
};

export type DossierNotification = {
  dossier: DossierId;
  viewed: boolean;
  /** Latest detected applicant change, including revisions already acknowledged. */
  updated_at: Date | null;
  viewed_at: Date | null;
  new_arrival: { detected_at: Date } | null;
  new_follow: { revision: string; detected_at: Date } | null;
  changes: FieldChange[];
};

export type NotificationUpdate = {
  dossier: DossierId;
  arrival?: true;
  followRevision?: string;
  revisions?: ActionDossierId[];
};

export const identityTypeLabels = {
  demandeur: "Demandeur",
  mandataire: "Mandataire",
  representant: "Représentant de l'entreprise",
} as const;

export const identityPropertyLabels = {
  first_names: "Prénom",
  last_name: "Nom",
  email: "Adresse électronique",
  phone: "Téléphone",
  role: "Qualité",
} as const;

export const companyPropertyLabels: Record<keyof Entreprise, string> = {
  legal_name: "Dénomination",
  siret: "SIRET",
  siren: "SIREN",
  legal_form: "Forme juridique",
  naf_label: "Libellé NAF",
  naf_code: "Code NAF",
  admin_status: "État administratif",
  creation_date: "Date de création",
  address: "Adresse",
  postal_code: "Code postal",
  insee_code: "Code INSEE",
  department: "Département",
  region: "Région",
  headcount: "Effectif",
  share_capital: "Capital social",
};

// Shared by the synchronization history and the field review UI.
export const applicantFieldLabels: Partial<Record<keyof Dossier, string>> = {
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
