import type Dossier from "./database/public/Dossier.ts";
import type { DossierDemarcheNumerique88444 } from "./demarche-numerique/Demarche88444.ts";
import type File from "./database/public/File.ts";
import type EvenementPhaseDossier from "./database/public/EvenementPhaseDossier.ts";
import type DecisionAdministrative from "./database/public/DecisionAdministrative.ts";
import type Prescription from "./database/public/Prescription.ts";
import type Controle from "./database/public/Controle.ts";
import type AvisExpert from "./database/public/AvisExpert.ts";

type DossierPersonnesImpliqueesSummary = {
  déposant_nom: string;
  déposant_prénoms: string;
  demandeur_personne_physique_nom: string;
  demandeur_personne_physique_prénoms: string;
  demandeur_personne_morale_raison_sociale: string;
  demandeur_personne_morale_siret: string;
};

type DossierPersonnesImpliqueesFull = DossierPersonnesImpliqueesSummary & {
  demandeur_adresse: string;
  déposant_email: string | null;

  demandeur_personne_physique_email: string | null;
  demandeur_personne_physique_address: string | null;
  demandeur_personne_physique_phone: string | null;
  demandeur_personne_physique_role: string | null;

  demandeur_personne_morale_siren: string | null;
  demandeur_personne_morale_legal_form: string | null;
  demandeur_personne_morale_naf_code: string | null;
  demandeur_personne_morale_naf_label: string | null;
  demandeur_personne_morale_creation_date: string | null;
  demandeur_personne_morale_admin_status: string | null;
  demandeur_personne_morale_headcount: string | null;
  demandeur_personne_morale_share_capital: string | null;
  demandeur_personne_morale_insee_code: string | null;
  demandeur_personne_morale_postal_code: string | null;
  demandeur_personne_morale_department: string | null;
  demandeur_personne_morale_region: string | null;

  representative_nom: string | null;
  representative_prénoms: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  representative_role: string | null;
};

/**
 * The types of a Dossier's properties are generated automatically via Kanel.
 * We chose to use a `string` type for the properties
 * 'phase' and 'prochaine_action_attendue_par'
 * for more flexibility (instead of an enum).
 *
 * We override these properties here to constrain their values.
 */

export type DossierPhase =
  | "Accompagnement amont"
  | "Étude recevabilité DDEP"
  | "Instruction"
  | "Controle"
  | "Classé sans suite"
  | "Obligations terminées";

export type DossierProchaineActionAttenduePar =
  | "Instructeur"
  | "CNPN/CSRPN"
  | "Pétitionnaire"
  | "Consultation du public"
  | "Autre administration"
  | "Autre"
  | "Personne";

/**
 * Kanel generates an `unknown` type for JSON fields.
 *
 * We override the `communes`, `départements` and `régions` properties here to constrain the type of the JSON values.
 *
 */
type DossierDemarcheSimplifiee88444Communes = {
  name: string;
  code: string;
  postalCode: string;
};

type DossierLocalisation = {
  communes: DossierDemarcheSimplifiee88444Communes[] | null | undefined;
  départements: string[] | null | undefined;
  régions: string[] | null | undefined;
};

type DossierActivitePrincipale = {
  activité_principale: DossierDemarcheNumerique88444["Activité principale"] | null;
};

/**
 * Permissive GeoJSON type for the "Cartographie du projet".
 *
 * Areas drawn by the usager in Démarche Numérique can be Polygon, MultiPolygon, Point…
 * so the geometry is kept deliberately loose (unlike the strict types in `geomce.ts`),
 * so it can be downloaded as-is and loaded directly as a MapLibre source.
 */
export type GeoJSONGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: unknown;
};

export type GeoJSONFeature = {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown> | null;
};

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

type DossierCartographieProjet = {
  cartographie_projet: GeoJSONFeatureCollection | null;
};

type DossierDataForStats = {
  décisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
};

/**
 * The DossierSummary type contains the data needed to display the tracking table
 * and to be able to perform searches in the tracking table
 * or the summary panel shared across the tabs of the screens showing a single dossier
 *
 * It is intended to be fairly easy to query in bulk
 */
export type DossierSummary = Pick<
  Dossier,
  | "id"
  | "number_demarches_simplifiées"
  | "nom"
  | "date_dépôt"
  | "enjeu"
  | "rattaché_au_régime_ae"
  | "prochaine_action_attendue_par"
  | "commentaire_libre"
  | "historique_identifiant_demande_onagre"
> & { phase: DossierPhase; date_début_phase: Date } & DossierLocalisation &
  DossierPersonnesImpliqueesSummary &
  DossierActivitePrincipale &
  DossierDataForStats;

export type FrontEndPrescription = Prescription & { contrôles: Controle[] | undefined };

export type FrontEndFichier = Pick<File, "media_type" | "nom"> & {
  url: string;
  taille?: number | null;
};

export type FrontEndDecisionAdministrative = Omit<DecisionAdministrative, "fichier"> & {
  fichier_url: string | undefined;
  fichier_description?: FrontEndFichier;
} & { prescriptions: FrontEndPrescription[] | undefined };

export type DecisionAdministrativeForTransfer = Partial<
  Omit<DecisionAdministrative, "fichier"> & {
    fichier_base64: { contenuBase64: string; nom: string; media_type: string };
  }
>;

export type FrontEndAvisExpert = Omit<AvisExpert, "avis_fichier" | "saisine_fichier"> & {
  avis_fichier_url: string | undefined;
  saisine_fichier_url: string | undefined;
  avis_fichier_description?: FrontEndFichier;
  saisine_fichier_description?: FrontEndFichier;
};

export type FrontEndAttachmentAutre = {
  id: string;
  dossier: Dossier["id"];
  fichier: File["id"];
  type: string;
  attachment_date: Date | string | null;
  created_at: Date | string;
  fichier_url: string | undefined;
  fichier_description?: FrontEndFichier;
};

/**
 * The DossierFull type contains all the information related to a dossier,
 * notably the download URL of the impacted species file if there is one
 */
export type DossierFull = Omit<
  Dossier,
  "communes" | "départements" | "régions" | "activité_principale" | "cartographie_projet"
> &
  DossierLocalisation &
  DossierPersonnesImpliqueesFull &
  DossierActivitePrincipale &
  DossierCartographieProjet & {
    espècesImpactées: (Pick<File, "media_type" | "nom"> & { url: string }) | undefined;
  } & { évènementsPhase: EvenementPhaseDossier[] } & {
    décisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
  } & { avisExpert: FrontEndAvisExpert[] } & {
    piècesJointesPétitionnaires: (Pick<File, "DS_createdAt" | "media_type" | "nom"> & {
      url: string;
      taille: number;
    })[];
  } & { attachmentAutres: FrontEndAttachmentAutre[] };

export type TypeDecisionAdministrative =
  | "Arrêté dérogation"
  | "Arrêté refus"
  | "Arrêté modificatif"
  | "Courrier"
  | "Autre décision";

export type ResultatControle =
  | "Conforme"
  | "Non conforme"
  | "Trop tard"
  | "En cours"
  | "Non conforme (Pas d'informations reçues)";
export type TypesActionSuiteControle =
  | "Email"
  | "Courrier"
  | "Courrier recommandé avec accusé de réception";

// - - - - - Statistics - - - - - - //
export interface StatsPubliques {
  numberDossiersEnPhaseControle: number;
  numberDossiersEnPhaseControleWithDecision: number;
  numberDossiersEnPhaseControleWithoutDecision: number;
  numberPetitionnairesSinceSept2024: number;
  totalDossiers: number;
  totalPrescriptions: number;
  numberPrescriptionsControlees: number;
  statsConformité: StatsConformite;
  statsImpactBiodiversité: StatsImpactBiodiversite;
}

/**
 * Prescription statistics by conformity.
 */
export interface StatsConformite {
  /** The number of prescriptions whose last contrôle is Non conforme */
  nb_non_conforme: number;

  /** The number of prescriptions whose last contrôle is Trop tard */
  nb_trop_tard: number;

  /** The number of prescriptions that became conforme after the 1st contrôle */
  nb_conforme_apres_1: number;

  /** The number of prescriptions that became conforme after the 2nd contrôle */
  nb_conforme_apres_2: number;

  /** The number of prescriptions that became conforme after the 3rd contrôle */
  nb_conforme_apres_3: number;

  /** The number of prescriptions with a return to conformity after more than one contrôle */
  nb_retour_conformite: number;
}

/**
 * Biodiversity impact statistics of the conforme prescriptions.
 */
export interface StatsImpactBiodiversite {
  /** The total number of prescriptions with at least one conforme contrôle */
  total_prescriptions_conformes: number;

  /** The total sum of avoided areas (in m² or ha depending on the unit) */
  total_surface_évitée: number;

  /** The total sum of compensated areas */
  total_surface_compensée: number;

  /** The total number of avoided nests */
  total_nids_évités: number;

  /** The total number of compensated nests */
  total_nids_compensés: number;

  /** The total number of avoided individuals */
  total_individus_évités: number;

  /** The total number of compensated individuals */
  total_individus_compensés: number;
}

/**
 * AARRI (tracking indicators).
 */
export interface IndicateursAARRI {
  nombreBaseUtilisateuricePotentielle: number;
  nombreUtilisateuriceAcquis: number;
  nombreUtilisateuriceActif: number;
  nombreUtilisateuriceRetenu: number;
  nombreUtilisateuriceImpact: number;
  date: string;
}

/**
 * AARRI level of a single personne, from the lowest to the highest funnel stage:
 * - base: a Pitchou account exists but has never connected
 * - acquis: has connected at least once
 * - actif: made at least 5 modification actions within a single calendar week
 * - retenu: validated at least 5 weeks (≥5 consultation/modification actions each)
 *   within an 8-week sliding window
 * - impact: produced at least one "retour à la conformité"
 */
export type NiveauAARRI = "base" | "acquis" | "actif" | "retenu" | "impact";

/**
 * A Pitchou user with their current AARRI level and a few summary metrics,
 * for the admin page.
 */
export interface UtilisateurAARRI {
  personneId: number;
  email: string | null;
  nom: string | null;
  prenoms: string | null;
  niveau: NiveauAARRI;
  /** Names of the groupes instructeurs the personne belongs to (may be empty) */
  groupesInstructeurs: string[];
  /** Total number of consultation and modification actions */
  actionCount: number;
  /** ISO date of the last metric event, or null if there is none */
  lastActivityDate: string | null;
}

export type ChampFormulaire88444 = keyof DossierDemarcheNumerique88444;
