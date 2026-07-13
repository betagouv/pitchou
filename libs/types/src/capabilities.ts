import type {
  DossierComplet,
  DossierRésumé,
  DécisionAdministrativePourTransfer,
  FrontEndPrescription,
} from "./API_Pitchou.ts";
import type Dossier from "./database/public/Dossier.ts";
import type Personne from "./database/public/Personne.ts";
import type Message from "./database/public/Message.ts";
import type Notification from "./database/public/Notification.ts";
import type { NotificationMutator } from "./database/public/Notification.ts";
import type Prescription from "./database/public/Prescription.ts";
import type Contrôle from "./database/public/Contrôle.ts";
import type DécisionAdministrative from "./database/public/DécisionAdministrative.ts";
import type AvisExpert from "./database/public/AvisExpert.ts";
import type { ÉvènementMétrique } from "./évènement.ts";

export interface PitchouInstructeurCapabilities {
  listerDossiers: () => Promise<DossierRésumé[]>;
  recupérerDossierComplet: (dossierId: DossierComplet["id"]) => Promise<DossierComplet>;
  listerRelationSuivi: () => Promise<
    { personneEmail: Personne["email"]; dossiersSuivisIds: Dossier["id"][] }[]
  >;
  modifierRelationSuivi: (
    direction: "suivre" | "laisser",
    personneEmail: NonNullable<Personne["email"]>,
    dossierId: Dossier["id"],
  ) => Promise<void>;
  listerMessages: (dossierId: DossierRésumé["id"]) => Promise<Message[]>;
  listerÉvènementsPhaseDossier: () => Promise<any[]>;
  modifierDossier: (dossierId: Dossier["id"], dossier: Partial<DossierComplet>) => Promise<void>;
  remplirAnnotations: (annotations: any) => Promise<void>;
  modifierDécisionAdministrativeDansDossier: (
    décisionAdministrative: DécisionAdministrativePourTransfer,
  ) => Promise<void>;
  deleteDecisionAdministrative: (id: DécisionAdministrative["id"]) => Promise<unknown>;
  addOrUpdatePrescription: (
    prescription: Partial<Prescription>,
  ) => Promise<Prescription["id"] | undefined>;
  addPrescriptionsAndControles: (
    prescriptions: Omit<FrontEndPrescription, "id">[],
  ) => Promise<unknown>;
  deletePrescription: (id: Prescription["id"]) => Promise<unknown>;
  addOrUpdateControle: (contrôle: Partial<Contrôle>) => Promise<Contrôle["id"] | undefined>;
  deleteControle: (id: Contrôle["id"]) => Promise<unknown>;
  addOrUpdateAvisExpert: (form: FormData) => Promise<string>;
  addAttachmentAutre: (form: FormData) => Promise<string>;
  deleteAvisExpert: (id: AvisExpert["id"]) => Promise<unknown>;
  créerÉvènementMetrique: (évènement: ÉvènementMétrique) => Promise<void>;
  /** The instructeur's last 3 distinct search-bar texts, most recent first */
  listRecentSearches: () => Promise<string[]>;
  listerNotifications: () => Promise<Notification[]>;
  updateNotificationForDossier: (notification: NotificationMutator) => Promise<void>;
}

export interface IdentitéInstructeurPitchou {
  email: string;
  estAdmin: boolean;
  /** Names of the groupes instructeurs (services) the instructeur belongs to (may be empty) */
  groupesInstructeurs: string[];
}
