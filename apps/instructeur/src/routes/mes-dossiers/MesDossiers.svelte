<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";

  import ListDossiers from "$lib/components/ListDossiers/ListDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierSummary[];
    followRelations?: PitchouState["followRelations"];
    notificationByDossier: PitchouState["notificationByDossier"];
  };

  let { email = "", dossiers = [], followRelations, notificationByDossier }: Props = $props();
</script>

<svelte:head>
  <title>Mes dossiers — Pitchou</title>
</svelte:head>

<ListDossiers
  title="Mes dossiers"
  {email}
  {dossiers}
  {followRelations}
  showFilterActionInstructeur
  {notificationByDossier}
/>
