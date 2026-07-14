import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { DossierCompletToDossierResume } from "@pitchou/common/outils-dossiers.ts";

import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";
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

export function setDossierComplet(nouveauDossierComplet: DossierComplet): void {
  store.dossiersComplets.set(nouveauDossierComplet.id, nouveauDossierComplet);
  const dossierResume = DossierCompletToDossierResume(nouveauDossierComplet);
  store.dossiersRésumés.set(nouveauDossierComplet.id, dossierResume);
}
