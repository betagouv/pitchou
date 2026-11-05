import { SvelteMap } from "svelte/reactivity";
import { store, type PitchouState } from "#lib/state/store.svelte.ts";
import { isDossierSummaryArray } from "@pitchou/common/typeguards.ts";
import { loadEspecesProtegeesList } from "#lib/especes/activitesMethodesMoyensDePoursuite.ts";
import { loadRelationSuivi, loadRecentSearches } from "#lib/shared/main.ts";

export function loadDossiers() {
  const followRelations = loadRelationSuivi();
  loadRecentSearches()?.catch((error) =>
    console.warn("Échec du chargement des recherches récentes", error),
  );
  loadEspecesProtegeesList().catch(() => {});

  if (store.capabilities?.listerDossiers) {
    return Promise.allSettled([store.capabilities.listerDossiers(), followRelations]).then(
      (results) => {
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
        const dossiers = results[0].status === "fulfilled" ? results[0].value : undefined;
        if (!isDossierSummaryArray(dossiers)) {
          throw new TypeError("On attendait un tableau de dossiers ici !");
        }

        /* Format the dossiers */
        for (const dossier of dossiers) {
          if (dossier.depot_date) dossier.depot_date = new Date(dossier.depot_date);
          if (dossier.phase_start_date)
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
      },
    );
  }
  return Promise.reject(new TypeError("Impossible de charger les dossiers, capability manquante"));
}
