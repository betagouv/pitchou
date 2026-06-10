import type { DossierComplet, DossierRésumé } from "./API_Pitchou.ts";
import type { SchemaDémarcheSimplifiée } from "./démarche-numérique/schema.ts";
import type { PitchouInstructeurCapabilities, IdentitéInstructeurPitchou } from "./capabilities.ts";
import type {
  ParClassification,
  ActivitéMenançante,
  EspèceProtégée,
  MéthodeMenançante,
  MoyenDePoursuiteMenaçant,
  ImpactQuantifié,
} from "./especes.d.ts";
import type Message from "./database/public/Message.ts";
import type Dossier from "./database/public/Dossier.ts";
import type Personne from "./database/public/Personne.ts";
import type Notification from "./database/public/Notification.ts";
import type RésultatSynchronisationDS88444 from "./database/public/RésultatSynchronisationDS88444.ts";

export type ActivitésMéthodesMoyensDePoursuiteBundle = {
  activités: ParClassification<Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>>;
  méthodes: ParClassification<Map<MéthodeMenançante["Code"], MéthodeMenançante>>;
  moyensDePoursuite: ParClassification<
    Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
  >;
  identifiantPitchouVersActivitéEtImpactsQuantifiés: Map<
    string,
    ActivitéMenançante & { impactsQuantifiés: ImpactQuantifié[] }
  >;
};

export type PitchouState = {
  capabilities: Partial<PitchouInstructeurCapabilities>;
  dossiersRésumés: Map<DossierRésumé["id"], DossierRésumé>;
  dossiersComplets: Map<DossierComplet["id"], DossierComplet>;
  messagesParDossierId: Map<DossierComplet["id"], Message[]>;
  relationSuivis?: Map<NonNullable<Personne["email"]>, Set<Dossier["id"]>>;
  notificationParDossier: Map<
    Dossier["id"],
    Pick<Notification, "vue" | "date_dernière_mise_à_jour">
  >;
  identité?: IdentitéInstructeurPitchou;
  schemaDS88444?: SchemaDémarcheSimplifiée;
  espècesProtégéesParClassification?: ParClassification<EspèceProtégée[]>;
  espèceByCD_REF?: Map<EspèceProtégée["CD_REF"], EspèceProtégée>;
  ActivitésMéthodesMoyensDePoursuite?: ActivitésMéthodesMoyensDePoursuiteBundle;
  erreurs: Set<{ message: string }>;
  résultatsSynchronisationDS88444?: RésultatSynchronisationDS88444[];
};
