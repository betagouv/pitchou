<script lang="ts">
  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";

  import ListeDossiers from "$lib/components/ListeDossiers/ListeDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    services?: string[];
    recentSearches?: string[];
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let {
    email = "",
    dossiers = [],
    relationSuivis,
    services = [],
    recentSearches = [],
    notificationParDossier,
  }: Props = $props();
</script>

<svelte:head>
  <title>Mes dossiers — Pitchou</title>
</svelte:head>

<ListeDossiers
  titre="Mes dossiers"
  {email}
  {dossiers}
  {relationSuivis}
  {services}
  {recentSearches}
  {notificationParDossier}
/>
