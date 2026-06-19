import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { DossierCompletToDossierRésumé } from "@pitchou/common/outils-dossiers.ts";

import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";
import type {
  PitchouState,
  ActivitésMéthodesMoyensDePoursuiteBundle,
} from "@pitchou/types/pitchou-state.ts";

export type { PitchouState, ActivitésMéthodesMoyensDePoursuiteBundle };

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
