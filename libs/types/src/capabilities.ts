import type {
  DossierFull,
  DossierSummary,
  DecisionAdministrativeForTransfer,
  FrontEndPrescription,
} from "./API_Pitchou.ts";
import type Dossier from "./database/public/Dossier.ts";
import type Personne from "./database/public/Personne.ts";
import type Notification from "./database/public/Notification.ts";
import type { NotificationMutator } from "./database/public/Notification.ts";
import type Prescription from "./database/public/Prescription.ts";
import type Controle from "./database/public/Controle.ts";
import type DecisionAdministrative from "./database/public/DecisionAdministrative.ts";
import type AvisExpert from "./database/public/AvisExpert.ts";
import type { EvenementMetrique } from "./evenement.ts";

export type DossierFollowerCandidate = {
  email: NonNullable<Personne["email"]>;
  firstNames: Personne["first_names"];
  lastName: Personne["last_name"];
  followsDossier: boolean;
};

/** A dossier comment as exchanged with the API. */
export type DossierCommentaire = {
  id: string;
  content: string;
  /** Dates travel as ISO strings on the wire. */
  created_at: string | Date;
  updated_at: string | Date | null;
  /** Null for the comment migrated from the former free comment (« initial »). */
  author_email: string | null;
};

export interface PitchouInstructeurCapabilities {
  listerDossiers: () => Promise<DossierSummary[]>;
  recupérerDossierComplet: (dossierId: DossierFull["id"]) => Promise<DossierFull>;
  listFollowRelations: () => Promise<
    { personneEmail: Personne["email"]; followedDossierIds: Dossier["id"][] }[]
  >;
  updateFollowRelation: (
    direction: "suivre" | "laisser",
    personneEmail: NonNullable<Personne["email"]>,
    dossierId: Dossier["id"],
  ) => Promise<void>;
  listDossierFollowerCandidates: (dossierId: Dossier["id"]) => Promise<DossierFollowerCandidate[]>;
  updateDossierFollowers: (
    dossierId: Dossier["id"],
    personneEmails: NonNullable<Personne["email"]>[],
  ) => Promise<void>;
  listerEvenementsPhaseDossier: () => Promise<any[]>;
  listerCommentaires: (dossierId: Dossier["id"]) => Promise<DossierCommentaire[]>;
  ajouterCommentaire: (dossierId: Dossier["id"], content: string) => Promise<DossierCommentaire>;
  modifierCommentaire: (
    dossierId: Dossier["id"],
    commentaire: Pick<DossierCommentaire, "id" | "content">,
  ) => Promise<void>;
  modifierDossier: (dossierId: Dossier["id"], dossier: Partial<DossierFull>) => Promise<void>;
  remplirAnnotations: (annotations: any) => Promise<void>;
  modifierDecisionAdministrativeDansDossier: (
    decisionAdministrative: DecisionAdministrativeForTransfer,
  ) => Promise<void>;
  deleteDecisionAdministrative: (id: DecisionAdministrative["id"]) => Promise<unknown>;
  addOrUpdatePrescription: (
    prescription: Partial<Prescription>,
  ) => Promise<Prescription["id"] | undefined>;
  addPrescriptionsAndControles: (
    prescriptions: Omit<FrontEndPrescription, "id">[],
  ) => Promise<unknown>;
  deletePrescription: (id: Prescription["id"]) => Promise<unknown>;
  addOrUpdateControle: (controle: Partial<Controle>) => Promise<Controle["id"] | undefined>;
  deleteControle: (id: Controle["id"]) => Promise<unknown>;
  addOrUpdateAvisExpert: (form: FormData) => Promise<string>;
  addOtherAttachment: (form: FormData) => Promise<string>;
  deleteAvisExpert: (id: AvisExpert["id"]) => Promise<unknown>;
  creerEvenementMetrique: (evenement: EvenementMetrique) => Promise<void>;
  /** The instructeur's last 3 distinct search-bar texts, most recent first */
  listRecentSearches: () => Promise<string[]>;
  listerNotifications: () => Promise<Notification[]>;
  updateNotificationForDossier: (notification: NotificationMutator) => Promise<void>;
}

export interface IdentiteInstructeurPitchou {
  email: string;
  estAdmin: boolean;
  /** Names of the groupes instructeurs (services) the instructeur belongs to (may be empty) */
  groupesInstructeurs: string[];
}
