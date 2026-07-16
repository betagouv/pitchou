import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { DossierFullToDossierSummary } from "@pitchou/common/dossiersUtils.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type {
  PitchouState,
  ActivitesMethodesMoyensDePoursuiteBundle,
} from "@pitchou/types/pitchou-state.ts";

export type { PitchouState, ActivitesMethodesMoyensDePoursuiteBundle };

export const store: PitchouState = $state({
  capabilities: {},
  dossierSummaries: new SvelteMap(),
  fullDossiers: new SvelteMap(),
  messagesByDossierId: new SvelteMap(),
  notificationByDossier: new SvelteMap(),
  errors: new SvelteSet(),
});

export function setDossierFull(newDossierFull: DossierFull): void {
  store.fullDossiers.set(newDossierFull.id, newDossierFull);
  const dossierSummary = DossierFullToDossierSummary(newDossierFull);
  store.dossierSummaries.set(newDossierFull.id, dossierSummary);
}
