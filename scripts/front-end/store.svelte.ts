import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { DossierCompletToDossierRésumé } from "../commun/outils-dossiers.js";

import type { DossierComplet, DossierRésumé } from "../types/API_Pitchou.ts";
import type { SchemaDémarcheSimplifiée } from "../types/démarche-numérique/schema.ts";
import type {
  PitchouInstructeurCapabilities,
  IdentitéInstructeurPitchou,
} from "../types/capabilities.ts";
import type {
  ParClassification,
  ActivitéMenançante,
  EspèceProtégée,
  MéthodeMenançante,
  MoyenDePoursuiteMenaçant,
  ImpactQuantifié,
} from "../types/especes.d.ts";
import type Message from "../types/database/public/Message.ts";
import type Dossier from "../types/database/public/Dossier.ts";
import type Personne from "../types/database/public/Personne.ts";
import type Notification from "../types/database/public/Notification.ts";
import type RésultatSynchronisationDS88444 from "../types/database/public/RésultatSynchronisationDS88444.ts";

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

export const store: PitchouState = $state({
  capabilities: {},
  dossiersRésumés: new SvelteMap(),
  dossiersComplets: new SvelteMap(),
  messagesParDossierId: new SvelteMap(),
  notificationParDossier: new SvelteMap(),
  erreurs: new SvelteSet(),
});

export function setDossierComplet(nouveauDossierComplet: DossierComplet): void {
  store.dossiersComplets.set(nouveauDossierComplet.id, nouveauDossierComplet);
  const dossierRésumé = DossierCompletToDossierRésumé(nouveauDossierComplet);
  store.dossiersRésumés.set(nouveauDossierComplet.id, dossierRésumé);
}
