<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { originDemarcheNumerique } from "@pitchou/common/constants.ts";
  import {
    instructeurLeavesDossier,
    instructeurFollowsDossier,
  } from "$lib/dossier/suiviDossier.ts";
  import SuiviInstructionFilters from "./SuiviInstructionFilters.svelte";
  import SuiviInstructionTable from "./SuiviInstructionTable.svelte";
  import { SuiviInstructionState } from "./suiviInstructionState.svelte.ts";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { FiltersLocalStorage, TableSort } from "@pitchou/types/interfaceUtilisateur.ts";

  type Props = {
    email: string;
    dossiers?: DossierSummary[];
    followRelations: PitchouState["followRelations"];
    activitesPrincipales?: string[];
    selectedSortId?: TableSort["id"];
    selectedFilters?: Partial<FiltersLocalStorage>;
    rememberSortFilters: any;
  };
  let {
    email,
    dossiers = [],
    followRelations,
    activitesPrincipales = [],
    selectedSortId,
    selectedFilters = {},
    rememberSortFilters,
  }: Props = $props();
  const state = untrack(
    () =>
      new SuiviInstructionState({
        email,
        dossiers,
        followRelations,
        activities: activitesPrincipales,
        selectedSortId,
        filters: selectedFilters,
        remember: rememberSortFilters,
      }),
  );
  $effect(() => state.persist());
  $effect(() => {
    if (state.pageSelectors) state.selectedPage = 1;
  });
  onMount(() => {
    if (state.text) state.search(state.text);
    else state.apply();
  });
</script>

<svelte:head><title>Suivi instruction — Pitchou</title></svelte:head>
<div class="fr-grid-row fr-mt-4w fr-grid-row--center">
  <div class="fr-col">
    <h1>
      Tableau de suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr
      >
    </h1>
    {#if dossiers.length}
      <SuiviInstructionFilters {state} />
      <SuiviInstructionTable
        {state}
        bind:selectedSort={state.selectedSort}
        follow={(id) => instructeurFollowsDossier(email, id)}
        leave={(id) => instructeurLeavesDossier(email, id)}
      />
    {:else}
      <div class="fr-mb-5w">
        Il n'y a pas encore de dossiers associés à votre groupe instructeurs.<br />Vous pouvez
        <a href={`${originDemarcheNumerique}/commencer/derogation-especes-protegees`}
          >créer des dossiers sur Démarche Numérique</a
        >. Et répondre un département correspondant à votre département ou région à la question
        "Dans quel département se localise majoritairement votre projet ?"<br />Le dossier sera
        alors visible ici après 10-15 minutes d'attente maximum
      </div>
    {/if}
  </div>
</div>
