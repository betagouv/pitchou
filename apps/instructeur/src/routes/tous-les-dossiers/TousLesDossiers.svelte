<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import ListeDossiers from "$lib/components/ListeDossiers/ListeDossiers.svelte";
  import { SvelteMap } from "svelte/reactivity";

  type Props = {
    email?: string;
    dossiers: DossierSummary[];
    relationSuivis?: PitchouState["relationSuivis"];
    notificationParDossier?: PitchouState["notificationParDossier"];
  };

  let {
    email = "",
    dossiers,
    relationSuivis,
    notificationParDossier = new SvelteMap(),
  }: Props = $props();
</script>

<svelte:head>
  <title>Tous les dossiers — Pitchou</title>
</svelte:head>

<ListeDossiers
  title="Tous les dossiers"
  {email}
  {dossiers}
  {relationSuivis}
  {notificationParDossier}
  showFilterSansInstructeurice
/>
