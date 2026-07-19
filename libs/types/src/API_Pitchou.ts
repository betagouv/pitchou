import type Dossier from "./database/public/Dossier.ts";
import type { DossierDemarcheNumerique88444 } from "./demarche-numerique/Demarche88444.ts";
import type File from "./database/public/File.ts";
import type EvenementPhaseDossier from "./database/public/EvenementPhaseDossier.ts";
import type DecisionAdministrative from "./database/public/DecisionAdministrative.ts";
import type Prescription from "./database/public/Prescription.ts";
import type Controle from "./database/public/Controle.ts";
import type AvisExpert from "./database/public/AvisExpert.ts";

type DossierPersonnesImpliqueesSummary = {
  deposant_last_name: string;
  deposant_first_names: string;
  demandeur_personne_physique_last_name: string;
  demandeur_personne_physique_first_names: string;
  demandeur_personne_morale_legal_name: string;
  demandeur_personne_morale_siret: string;
};

type DossierPersonnesImpliqueesFull = DossierPersonnesImpliqueesSummary & {
  demandeur_address: string;
  deposant_email: string | null;

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

  representative_last_name: string | null;
  representative_first_names: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  representative_role: string | null;

  mandataire_last_name: string | null;
  mandataire_first_names: string | null;
  mandataire_email: string | null;
};

/**
 * The types of a Dossier's properties are generated automatically via Kanel.
 * We chose to use a `string` type for the properties
 * 'phase' and 'next_action_expected_from'
 * for more flexibility (instead of an enum).
 *
 * We override these properties here to constrain their values.
 */

export type DossierPhase =
  | "Accompagnement amont"
  | "Étude recevabilité DDEP"
  | "Instruction"
  | "Contrôle"
  | "Classé sans suite"
  | "Obligations terminées";

export type DossierNextActionExpectedFrom =
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
 * We override the `communes`, `departments` and `regions` properties here to constrain the type of the JSON values.
 *
 */
type DossierDemarcheSimplifiee88444Communes = {
  name: string;
  code: string;
  postalCode: string;
};

type DossierLocalisation = {
  communes: DossierDemarcheSimplifiee88444Communes[] | null | undefined;
  departments: string[] | null | undefined;
  regions: string[] | null | undefined;
};

type DossierActivitePrincipale = {
  main_activite: DossierDemarcheNumerique88444["Activité principale"] | null;
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

type DossierProjetMap = {
  projet_map: GeoJSONFeatureCollection | null;
};

type DossierDataForStats = {
  decisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
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
  | "demarche_numerique_number"
  | "name"
  | "depot_date"
  | "enjeu"
  | "linked_to_ae_regime"
  | "next_action_expected_from"
  | "free_comment"
  | "onagre_demande_identifier"
> & { phase: DossierPhase; phase_start_date: Date } & DossierLocalisation &
  DossierPersonnesImpliqueesSummary &
  DossierActivitePrincipale &
  DossierDataForStats;

export type FrontEndPrescription = Prescription & { controles: Controle[] | undefined };

export type FrontEndFichier = Pick<File, "media_type" | "name"> & {
  url: string;
  size?: number | null;
};

export type FrontEndDecisionAdministrative = Omit<DecisionAdministrative, "fichier"> & {
  fichier_url: string | undefined;
  fichier_description?: FrontEndFichier;
} & { prescriptions: FrontEndPrescription[] | undefined };

export type DecisionAdministrativeForTransfer = Partial<
  Omit<DecisionAdministrative, "fichier"> & {
    fichier_base64: { contenuBase64: string; name: string; media_type: string };
  }
>;

export type FrontEndAvisExpert = Omit<AvisExpert, "avis_fichier" | "saisine_fichier"> & {
  avis_fichier_url: string | undefined;
  saisine_fichier_url: string | undefined;
  avis_fichier_description?: FrontEndFichier;
  saisine_fichier_description?: FrontEndFichier;
};

export type FrontEndOtherAttachment = {
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
  "communes" | "departments" | "regions" | "main_activite" | "projet_map"
> &
  DossierLocalisation &
  DossierPersonnesImpliqueesFull &
  DossierActivitePrincipale &
  DossierProjetMap & {
    especesImpactees: (Pick<File, "media_type" | "name"> & { url: string }) | undefined;
  } & { evenementsPhase: EvenementPhaseDossier[] } & {
    decisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
  } & { avisExpert: FrontEndAvisExpert[] } & {
    piecesJointesPetitionnaires: (Pick<
      File,
      "demarche_numerique_created_at" | "media_type" | "name"
    > & {
      url: string;
      size: number;
    })[];
  } & { otherAttachments: FrontEndOtherAttachment[] };

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
export interface PublicStats {
  dossierCount: number;
  controlePhaseDossierCount: number;
  controlePhaseDossierWithDecisionCount: number;
  controlePhaseDossierWithoutDecisionCount: number;
  petitionnaireCountSinceSeptember2024: number;
  controllablePrescriptionCount: number;
  prescriptionWithControleCount: number;
  conformiteStats: ConformiteStats;
  biodiversiteImpactStats: BiodiversiteImpactStats;
}

/**
 * Prescription statistics by conformity.
 */
export interface ConformiteStats {
  /** The number of prescriptions whose last contrôle is Non conforme */
  nonConformePrescriptionCount: number;

  /** The number of prescriptions whose last contrôle is Trop tard */
  tooLatePrescriptionCount: number;

  /** The number of prescriptions that became conforme after the 1st contrôle */
  prescriptionConformeAfterFirstControleCount: number;

  /** The number of prescriptions that became conforme after the 2nd contrôle */
  prescriptionConformeAfterSecondControleCount: number;

  /** The number of prescriptions that became conforme after the 3rd contrôle */
  prescriptionConformeAfterThirdControleCount: number;

  /** The number of prescriptions with a return to conformity after more than one contrôle */
  prescriptionReturnedToConformiteCount: number;
}

/**
 * Biodiversity impact statistics of the conforme prescriptions.
 */
export interface BiodiversiteImpactStats {
  /** The total number of prescriptions with at least one conforme contrôle */
  conformePrescriptionCount: number;

  /** The total sum of avoided areas (in m² or ha depending on the unit) */
  avoidedSurfaceTotal: number;

  /** The total sum of compensated areas */
  compensatedSurfaceTotal: number;

  /** The total number of avoided nests */
  avoidedNidsCount: number;

  /** The total number of compensated nests */
  compensatedNidsCount: number;

  /** The total number of avoided individuals */
  avoidedIndividusCount: number;

  /** The total number of compensated individuals */
  compensatedIndividusCount: number;
}

/**
 * AARRI (tracking indicators).
 */
export interface IndicatorsAARRI {
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
  lastName: string | null;
  firstNames: string | null;
  niveau: NiveauAARRI;
  /** Names of the groupes instructeurs the personne belongs to (may be empty) */
  groupesInstructeurs: string[];
  /** Total number of consultation and modification actions */
  actionCount: number;
  /** ISO date of the last metric event, or null if there is none */
  lastActivityDate: string | null;
}

export type ChampFormulaire88444 = keyof DossierDemarcheNumerique88444;
