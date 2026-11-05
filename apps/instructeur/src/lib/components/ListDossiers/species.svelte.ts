import { onMount } from "svelte";
import { store } from "#lib/state/store.svelte.ts";
import { loadEspecesProtegeesList } from "#lib/especes/activitesMethodesMoyensDePoursuite.ts";

let pending: ReturnType<typeof loadEspecesProtegeesList> | undefined;

export function loadFilterSpecies() {
  if (store.espèceByCD_REF) return Promise.resolve();
  pending ??= loadEspecesProtegeesList().finally(() => {
    pending = undefined;
  });
  return pending;
}

export function createSpeciesLoader() {
  let error = $state(false);
  async function load() {
    error = false;
    try {
      await loadFilterSpecies();
    } catch {
      error = true;
    }
  }
  onMount(() => {
    void load();
  });
  return {
    load,
    get error() {
      return error;
    },
  };
}
