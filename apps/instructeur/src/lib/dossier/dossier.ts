import { SvelteMap } from "svelte/reactivity";

import { store, setDossierFull } from "$lib/state/store.svelte.ts";

import { parseFichierEspecesImpactees } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";
import {
  loadActivitesMethodesMoyensDePoursuite,
  loadEspecesProtegeesList,
} from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
import { isDossierSummaryArray } from "@pitchou/common/typeguards.ts";
import { loadRelationSuivi, loadRecentSearches } from "$lib/shared/main.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { ResultatImportFichierEspeces } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";

/**
 * Local writes race the background refreshes: a payload fetched before a save
 * must never overwrite it. Every optimistic write bumps its dossier's version,
 * and a refresh that saw the version move while its payload travelled discards it.
 */
const localWriteVersions = new Map<DossierFull["id"], number>();

function recordLocalWrite(id: DossierFull["id"]) {
  localWriteVersions.set(id, (localWriteVersions.get(id) ?? 0) + 1);
}

export function updateDossier(dossier: DossierFull, updates: Partial<DossierFull>): Promise<void> {
  if (!store.capabilities.modifierDossier)
    throw new TypeError(`Capability modifierDossier manquante`);

  // optimistically modify the dossier in the store
  const updatedDossier: DossierFull = Object.assign({}, dossier, updates);
  if (updates.evenementsPhase) {
    updatedDossier.evenementsPhase = [...updates.evenementsPhase, ...dossier.evenementsPhase];
  }

  // The metric events of these changes are recorded by the server, along with the
  // historique of the dossier, so a single act is never reported twice.
  recordLocalWrite(dossier.id);
  setDossierFull(updatedDossier);

  return store.capabilities.modifierDossier(dossier.id, updates).catch((err) => {
    // On error, roll back the champs of this save only: restoring the whole
    // pre-save snapshot would also revert what another save merged meanwhile.
    const current = store.fullDossiers.get(dossier.id);
    if (current) {
      const revertedChamps = Object.fromEntries(
        Object.keys(updates).map((champ) => [champ, dossier[champ as keyof DossierFull]]),
      );
      recordLocalWrite(dossier.id);
      setDossierFull({ ...current, ...revertedChamps });
    }
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
    recordLocalWrite(id);
    store.fullDossiers.set(id, { ...full, next_due_date: nextDueDate });
  }

  return store.capabilities
    .modifierDossier(id, { next_due_date: nextDueDate })
    .catch((err) => {
      // on error, put the échéance back the way it was before the optimistic update
      if (summary) store.dossierSummaries.set(id, summary);
      const current = store.fullDossiers.get(id);
      if (full && current) {
        recordLocalWrite(id);
        store.fullDossiers.set(id, { ...current, next_due_date: full.next_due_date });
      }
      throw err;
    })
    .then(() => undefined);
}

/**
 * A read-only dossier is a different, narrower resource than the full one — the
 * server strips what is not shared — so the two are cached separately. A full
 * dossier must never be served in read-only mode: the preview exists to show the
 * narrowed payload. The other way round is fine, and even the only option — for
 * a dossier merely shared with the groupe, the server narrows the payload
 * whatever the request asked, so the read-only cache holds all there is and
 * waiting on `fullDossiers` to fill up would wait forever.
 */
export async function getDossierFull(
  id: DossierFull["id"],
  { readOnly = false }: { readOnly?: boolean } = {},
): Promise<DossierFull> {
  const dossierFullInStore = readOnly
    ? store.readOnlyDossiers.get(id)
    : (store.fullDossiers.get(id) ?? store.readOnlyDossiers.get(id));

  if (dossierFullInStore) {
    // stale-while-revalidate: return the cached dossier for instant navigation,
    // and refresh it in the background so the store catches up with changes
    // made elsewhere (e.g. a synchronization with DN)
    refreshDossierFull(id, { readOnly }).catch((err) => {
      console.error(`Échec du rafraîchissement du dossier ${id}`, err);
    });
    return dossierFullInStore;
  }

  return refreshDossierFull(id, { readOnly });
}

export async function refreshDossierFull(
  id: DossierFull["id"],
  { readOnly = false }: { readOnly?: boolean } = {},
): Promise<DossierFull> {
  if (!store.capabilities.recupérerDossierComplet)
    throw new TypeError(`Capability recupérerDossierComplet manquante`);

  const versionBeforeFetch = localWriteVersions.get(id) ?? 0;
  const dossierFull = await store.capabilities.recupérerDossierComplet(id, readOnly);

  if ((localWriteVersions.get(id) ?? 0) !== versionBeforeFetch) {
    // A champ was saved while this payload travelled: it predates the save, and
    // caching it would undo what the instructeur just did. The next refresh
    // brings a payload that includes the save.
    const kept = (readOnly ? store.readOnlyDossiers : store.fullDossiers).get(id);
    return kept ?? dossierFull;
  }

  // The server strips the dossier as soon as the cap only has read access, even
  // when it was not asked to, so the payload decides where it is cached.
  if (dossierFull.access === "lecture" || readOnly) {
    // Never through `setDossierFull`: a stripped dossier must not reach
    // `fullDossiers`, nor overwrite the summary the dossier list is built from.
    store.readOnlyDossiers.set(id, dossierFull);
  } else {
    setDossierFull(dossierFull);
  }

  return dossierFull;
}

export async function especesImpacteesFromFichierOdsArrayBuffer(
  fichierArrayBuffer: ArrayBuffer,
): Promise<ResultatImportFichierEspeces> {
  const especesProtegees = loadEspecesProtegeesList();
  const actMetTrans = loadActivitesMethodesMoyensDePoursuite();

  const { espèceByCD_REF: especeByCD_REF } = await especesProtegees;
  const referentiel = await actMetTrans;

  return parseFichierEspecesImpactees(fichierArrayBuffer, especeByCD_REF, referentiel);
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
