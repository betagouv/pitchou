import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { DossierFullToDossierSummary } from "@pitchou/common/outils-dossiers.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type {
  PitchouState,
  ActivitesMethodesMoyensDePoursuiteBundle,
} from "@pitchou/types/pitchou-state.ts";

export type { PitchouState, ActivitesMethodesMoyensDePoursuiteBundle };

export const store: PitchouState = $state({
  capabilities: {},
  dossiersRésumés: new SvelteMap(),
  dossiersComplets: new SvelteMap(),
  messagesParDossierId: new SvelteMap(),
  notificationParDossier: new SvelteMap(),
  erreurs: new SvelteSet(),
});

export function setDossierFull(newDossierFull: DossierFull): void {
  store.dossiersComplets.set(newDossierFull.id, newDossierFull);
  const dossierSummary = DossierFullToDossierSummary(newDossierFull);
  store.dossiersRésumés.set(newDossierFull.id, dossierSummary);
}
