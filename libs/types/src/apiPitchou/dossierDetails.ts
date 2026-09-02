import type AvisExpert from "../database/public/AvisExpert.ts";
import type Controle from "../database/public/Controle.ts";
import type DecisionAdministrative from "../database/public/DecisionAdministrative.ts";
import type Dossier from "../database/public/Dossier.ts";
import type EvenementPhaseDossier from "../database/public/EvenementPhaseDossier.ts";
import type File from "../database/public/File.ts";
import type Prescription from "../database/public/Prescription.ts";
import type {
  DossierCommonData,
  DossierPersonnesImpliqueesFull,
  GeoJSONFeatureCollection,
} from "./dossierBase.ts";
import type { QuantifiedImpact } from "../especesImpact.d.ts";

/**
 * What a cap may do with a dossier: instruct it, or only consult the part of it
 * that its service shared with another one.
 */
export type DossierAccess = "complet" | "lecture";

export type FrontEndPrescription = Prescription & { controles: Controle[] | undefined };

export type FrontEndFichier = Pick<File, "media_type" | "name"> & {
  url: string;
  size?: number | null;
};

export type FrontEndDecisionAdministrative = Omit<DecisionAdministrative, "fichier"> & {
  fichier_url: string | undefined;
  fichier_description?: FrontEndFichier;
  hasFile?: boolean;
  prescriptions: FrontEndPrescription[] | undefined;
};

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

export type FrontEndImpactOnEspece = {
  espece: {
    CD_REF: string;
    nomVernaculaire: string;
    nomScientifique: string;
    especeCNPN: boolean;
    especeMinisterielle: boolean;
  };
  /** null when the fichier espèce left the type d'impact empty. */
  typeImpact: {
    identifiantPitchou: string;
    libelle: string;
    criteriaAllowed: QuantifiedImpact[];
  } | null;
  methode: string | null;
  moyenDePoursuite: string | null;
  nombreIndividus: string | null;
  nids: number | null;
  oeufs: number | null;
  surfaceHabitatDetruit: number | null;
};

export type FrontEndImpactOnEspecesWithSourceFile = {
  sourceFile: (Pick<File, "media_type" | "name"> & { url: string }) | undefined;
  impacts: FrontEndImpactOnEspece[];
};

export type DossierFull = Omit<
  Dossier,
  "communes" | "departments" | "regions" | "main_activite" | "projet_map" | "source"
> &
  DossierCommonData &
  DossierPersonnesImpliqueesFull & {
    /**
     * What the cap that fetched this dossier may do with it. `lecture` means the
     * payload is already narrowed and no write will be accepted, whatever the UI
     * offers — one cap is `complet` for its own dossiers and `lecture` for the
     * ones another service shared, so this cannot be answered globally.
     */
    access: DossierAccess;
    /** Content of the dossier's most recent commentaire. */
    latestCommentaire: string | null;
    projet_map: GeoJSONFeatureCollection | null;
    especesImpactees: FrontEndImpactOnEspecesWithSourceFile;
    evenementsPhase: EvenementPhaseDossier[];
    decisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
    avisExpert: FrontEndAvisExpert[];
    piecesJointesPetitionnaires: (Pick<
      File,
      "demarche_numerique_created_at" | "media_type" | "name"
    > & {
      url: string;
      size: number;
    })[];
    otherAttachments: FrontEndOtherAttachment[];
  };

export type TypeDecisionAdministrative =
  "Arrêté dérogation" | "Arrêté refus" | "Arrêté modificatif" | "Courrier" | "Autre décision";

export type ResultatControle =
  | "Conforme"
  | "Non conforme"
  | "Trop tard"
  | "En cours"
  | "Non conforme (Pas d'informations reçues)";

export type TypesActionSuiteControle =
  "Email" | "Courrier" | "Courrier recommandé avec accusé de réception";
