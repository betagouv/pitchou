import type {
  DossierFull,
  DossierSummary,
  DecisionAdministrativeForTransfer,
  FrontEndPrescription,
} from "./API_Pitchou.ts";
import type Dossier from "./database/public/Dossier.ts";
import type Personne from "./database/public/Personne.ts";
import type Message from "./database/public/Message.ts";
import type Notification from "./database/public/Notification.ts";
import type { NotificationMutator } from "./database/public/Notification.ts";
import type Prescription from "./database/public/Prescription.ts";
import type Controle from "./database/public/Controle.ts";
import type DecisionAdministrative from "./database/public/DecisionAdministrative.ts";
import type AvisExpert from "./database/public/AvisExpert.ts";
import type { EvenementMetrique } from "./evenement.ts";

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
  listerMessages: (dossierId: DossierSummary["id"]) => Promise<Message[]>;
  listerEvenementsPhaseDossier: () => Promise<any[]>;
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
