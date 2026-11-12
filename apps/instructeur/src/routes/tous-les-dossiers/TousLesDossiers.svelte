<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "#lib/state/store.svelte.ts";
  import ListDossiers from "#lib/components/ListDossiers/ListDossiers.svelte";
  import { SvelteMap } from "svelte/reactivity";

  type Props = {
    email?: string;
    loading?: boolean;
    loadError?: string;
    onRetry?: () => void;
    dossiers: DossierSummary[];
    followRelations?: PitchouState["followRelations"];
    services?: string[];
    recentSearches?: string[];
    notificationByDossier?: PitchouState["notificationByDossier"];
  };

  let {
    email = "",
    loading = false,
    loadError = "",
    onRetry,
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
  {loading}
  {loadError}
  {onRetry}
  title="Tous les dossiers"
  {email}
  {dossiers}
  {followRelations}
  {services}
  {recentSearches}
  {notificationByDossier}
  showFilterInstructeurice
  showFilterSource
/>
