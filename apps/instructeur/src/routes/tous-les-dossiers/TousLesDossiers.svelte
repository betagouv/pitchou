<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import ListDossiers from "$lib/components/ListDossiers/ListDossiers.svelte";
  import { SvelteMap } from "svelte/reactivity";

  type Props = {
    email?: string;
    dossiers: DossierSummary[];
    followRelations?: PitchouState["followRelations"];
    services?: string[];
    recentSearches?: string[];
    notificationByDossier?: PitchouState["notificationByDossier"];
  };

  let {
    email = "",
    dossiers,
    followRelations,
    services = [],
    recentSearches = [],
    notificationByDossier = new SvelteMap(),
  }: Props = $props();
</script>

<svelte:head>
  <title>Tous les dossiers — Pitchou</title>
</svelte:head>

<ListDossiers
  title="Tous les dossiers"
  {email}
  {dossiers}
  {followRelations}
  {services}
  {recentSearches}
  {notificationByDossier}
  showFilterInstructeurice
/>
