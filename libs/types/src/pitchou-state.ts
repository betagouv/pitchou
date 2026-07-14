import type { DossierComplet, DossierResume } from "./API_Pitchou.ts";
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
import type ResultatSynchronisationDS88444 from "./database/public/ResultatSynchronisationDS88444.ts";

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
  dossiersRésumés: Map<DossierResume["id"], DossierResume>;
  dossiersComplets: Map<DossierComplet["id"], DossierComplet>;
  messagesParDossierId: Map<DossierComplet["id"], Message[]>;
  relationSuivis?: Map<NonNullable<Personne["email"]>, Set<Dossier["id"]>>;
  notificationParDossier: Map<
    Dossier["id"],
    Pick<Notification, "vue" | "date_dernière_mise_à_jour">
  >;
  identité?: IdentiteInstructeurPitchou;
  /** Upload size limit in bytes, mirrors the server's BODY_SIZE_LIMIT. */
  maxUploadSizeBytes?: number;
  schemaDS88444?: SchemaDemarcheSimplifiee;
  espècesProtégéesParClassification?: ByClassification<EspeceProtegee[]>;
  espèceByCD_REF?: Map<EspeceProtegee["CD_REF"], EspeceProtegee>;
  ActivitésMéthodesMoyensDePoursuite?: ActivitesMethodesMoyensDePoursuiteBundle;
  erreurs: Set<{ message: string }>;
  résultatsSynchronisationDS88444?: ResultatSynchronisationDS88444[];
};
