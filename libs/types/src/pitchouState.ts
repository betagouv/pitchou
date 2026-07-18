import type { DossierFull, DossierSummary } from "./API_Pitchou.ts";
import type { SchemaDemarcheSimplifiee } from "./demarche-numerique/schema.ts";
import type { PitchouInstructeurCapabilities, IdentiteInstructeurPitchou } from "./capabilities.ts";
import type {
  ByClassification,
  ActiviteMenancante,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
  QuantifiedImpact,
} from "./especes.d.ts";
import type Message from "./database/public/Message.ts";
import type Dossier from "./database/public/Dossier.ts";
import type Personne from "./database/public/Personne.ts";
import type Notification from "./database/public/Notification.ts";
import type DemarcheNumerique88444SynchronizationResult from "./database/public/DemarcheNumerique88444SynchronizationResult.ts";

export type ActivitesMethodesMoyensDePoursuiteBundle = {
  activités: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>;
  méthodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>;
  moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  >;
  identifiantPitchouVersActivitéEtImpactsQuantifiés: Map<
    string,
    ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] }
  >;
};

export type PitchouState = {
  capabilities: Partial<PitchouInstructeurCapabilities>;
  dossierSummaries: Map<DossierSummary["id"], DossierSummary>;
  fullDossiers: Map<DossierFull["id"], DossierFull>;
  messagesByDossierId: Map<DossierFull["id"], Message[]>;
  followRelations?: Map<NonNullable<Personne["email"]>, Set<Dossier["id"]>>;
  notificationByDossier: Map<Dossier["id"], Pick<Notification, "viewed" | "updated_at">>;
  identité?: IdentiteInstructeurPitchou;
  /** Upload size limit in bytes, mirrors the server's BODY_SIZE_LIMIT. */
  maxUploadSizeBytes?: number;
  schemaDS88444?: SchemaDemarcheSimplifiee;
  espècesProtégéesParClassification?: ByClassification<EspeceProtegee[]>;
  espèceByCD_REF?: Map<EspeceProtegee["CD_REF"], EspeceProtegee>;
  ActivitésMéthodesMoyensDePoursuite?: ActivitesMethodesMoyensDePoursuiteBundle;
  errors: Set<{ message: string }>;
  demarcheNumerique88444SynchronizationResults?: DemarcheNumerique88444SynchronizationResult[];
};
