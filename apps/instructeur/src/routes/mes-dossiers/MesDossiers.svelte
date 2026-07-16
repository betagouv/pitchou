<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";

  import ListeDossiers from "$lib/components/ListeDossiers/ListeDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierSummary[];
    relationSuivis?: PitchouState["relationSuivis"];
    notificationByDossier: PitchouState["notificationByDossier"];
  };

  let { email = "", dossiers = [], relationSuivis, notificationByDossier }: Props = $props();
</script>

<svelte:head>
  <title>Mes dossiers — Pitchou</title>
</svelte:head>

<ListeDossiers
  title="Mes dossiers"
  {email}
  {dossiers}
  {relationSuivis}
  showFilterActionInstructeur
  {notificationByDossier}
/>
