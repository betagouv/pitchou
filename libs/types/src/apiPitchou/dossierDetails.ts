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

export type DossierFull = Omit<
  Dossier,
  "communes" | "departments" | "regions" | "main_activite" | "projet_map" | "source"
> &
  DossierCommonData &
  DossierPersonnesImpliqueesFull & {
    /** Content of the dossier's most recent commentaire. */
    latestCommentaire: string | null;
    projet_map: GeoJSONFeatureCollection | null;
    especesImpactees: (Pick<File, "media_type" | "name"> & { url: string }) | undefined;
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
