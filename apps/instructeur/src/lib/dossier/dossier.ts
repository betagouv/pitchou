import { SvelteMap } from "svelte/reactivity";

import { store, setDossierFull } from "$lib/state/store.svelte.ts";

import { importDescriptionMenacesEspecesFromOdsArrayBuffer } from "@pitchou/common/especesUtils.ts";
import {
  loadActivitesMethodesMoyensDePoursuite,
  loadEspecesProtegeesList,
} from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
import { isDossierSummaryArray } from "@pitchou/common/typeguards.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";
import { loadRelationSuivi, loadRecentSearches } from "$lib/shared/main.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

export function updateDossier(dossier: DossierFull, updates: Partial<DossierFull>): Promise<void> {
  if (!store.capabilities.modifierDossier)
    throw new TypeError(`Capability modifierDossier manquante`);

  // optimistically modify the dossier in the store
  const updatedDossier: DossierFull = Object.assign({}, dossier, updates);
  if (updates.evenementsPhase) {
    updatedDossier.evenementsPhase = [...updates.evenementsPhase, ...dossier.evenementsPhase];

    sendEvenement({ type: "changerPhase" });
  }

  if (updates.next_action_expected_from) {
    sendEvenement({ type: "changerProchaineActionAttendueDe" });
  }
  // The next expected action can be cleared, so an explicit `null` is a change too.
  if ("next_action_expected" in updates) {
    sendEvenement({ type: "changerProchaineActionAttendue" });
  }
  // The échéance can be cleared, so an explicit `null` is a change too.
  if ("next_due_date" in updates) {
    sendEvenement({ type: "changerDateProchaineEcheance" });
  }

  setDossierFull(updatedDossier);

  return store.capabilities.modifierDossier(dossier.id, updates).catch((err) => {
    // on error, restore the previous dossier in the store as it was before the copy
    setDossierFull(dossier);
    throw err;
  });
}

/**
 * Sets (or clears, with `null`) a dossier's next échéance from the list, where only the
 * summary is loaded. The summary and the full dossier — when it is cached — are updated
 * together, so the tile and the dossier page never disagree on the date.
 */
export function updateDossierNextDueDate(
  id: DossierSummary["id"],
  nextDueDate: Date | null,
): Promise<void> {
  if (!store.capabilities.modifierDossier)
    throw new TypeError(`Capability modifierDossier manquante`);

  const summary = store.dossierSummaries.get(id);
  const full = store.fullDossiers.get(id);

  if (summary) {
    store.dossierSummaries.set(id, Object.freeze({ ...summary, next_due_date: nextDueDate }));
  }
  if (full) {
    store.fullDossiers.set(id, { ...full, next_due_date: nextDueDate });
  }

  sendEvenement({ type: "changerDateProchaineEcheance" });

  return store.capabilities
    .modifierDossier(id, { next_due_date: nextDueDate })
    .catch((err) => {
      // on error, put the dossier back the way it was before the optimistic update
      if (summary) store.dossierSummaries.set(id, summary);
      if (full) store.fullDossiers.set(id, full);
      throw err;
    })
    .then(() => undefined);
}

export async function getDossierFull(id: DossierFull["id"]): Promise<DossierFull> {
  const dossierFullInStore = store.fullDossiers.get(id);

  if (dossierFullInStore) {
    // stale-while-revalidate: return the cached dossier for instant navigation,
    // and refresh it in the background so the store catches up with changes
    // made elsewhere (e.g. a synchronization with DN)
    refreshDossierFull(id).catch((err) => {
      console.error(`Échec du rafraîchissement du dossier ${id}`, err);
    });
    return dossierFullInStore;
  }

  return refreshDossierFull(id);
}

export async function refreshDossierFull(id: DossierFull["id"]): Promise<DossierFull> {
  if (!store.capabilities.recupérerDossierComplet)
    throw new TypeError(`Capability recupérerDossierComplet manquante`);

  const dossierFull = await store.capabilities.recupérerDossierComplet(id);
  setDossierFull(dossierFull);

  return dossierFull;
}

export async function especesImpacteesFromFichierOdsArrayBuffer(
  fichierArrayBuffer: ArrayBuffer,
): Promise<DescriptionMenacesEspeces> {
  const especesProtegees = loadEspecesProtegeesList();
  const actMetTrans = loadActivitesMethodesMoyensDePoursuite();

  const { espèceByCD_REF: especeByCD_REF } = await especesProtegees;
  const { activités: activites, méthodes: methodes, moyensDePoursuite } = await actMetTrans;

  return importDescriptionMenacesEspecesFromOdsArrayBuffer(
    fichierArrayBuffer,
    especeByCD_REF,
    activites,
    methodes,
    moyensDePoursuite,
  );
}

export function loadDossiers() {
  loadRelationSuivi();
  loadRecentSearches();

  if (store.capabilities?.listerDossiers) {
    return store.capabilities?.listerDossiers().then((dossiers) => {
      if (!isDossierSummaryArray(dossiers)) {
        throw new TypeError("On attendait un tableau de dossiers ici !");
      }

      /* Format the dossiers */
      for (const dossier of dossiers) {
        dossier.depot_date = new Date(dossier.depot_date);
        dossier.phase_start_date = new Date(dossier.phase_start_date);
        if (dossier.next_due_date) dossier.next_due_date = new Date(dossier.next_due_date);
      }

      // A SvelteMap, like the store's initial one: `$state` does not proxy Map instances,
      // so a plain Map here would freeze the list — later `.set()` calls (e.g. the optimistic
      // update of an échéance from a tile) would update the data without notifying the UI.
      const dossiersById: PitchouState["dossierSummaries"] = new SvelteMap();

      for (const dossier of dossiers) {
        Object.freeze(dossier);
        dossiersById.set(dossier.id, dossier);
      }

      store.dossierSummaries = dossiersById;

      return dossiersById;
    });
  } else {
    return Promise.reject(
      new TypeError("Impossible de charger les dossiers, capability manquante"),
    );
  }
}
