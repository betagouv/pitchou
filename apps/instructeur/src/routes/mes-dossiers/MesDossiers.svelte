<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";

  import ListDossiers from "$lib/components/ListDossiers/ListDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierSummary[];
    relationSuivis?: PitchouState["relationSuivis"];
    services?: string[];
    recentSearches?: string[];
    notificationByDossier: PitchouState["notificationByDossier"];
  };

  let {
    email = "",
    dossiers = [],
    relationSuivis,
    services = [],
    recentSearches = [],
    notificationByDossier,
  }: Props = $props();
</script>

<svelte:head>
  <title>Mes dossiers — Pitchou</title>
</svelte:head>

<!-- « à enjeux » is replaced by the « prochaine action à moi » quick filter: on this page
     every dossier is followed by the instructeur, so their own next action matters more -->
<ListDossiers
  title="Mes dossiers"
  {email}
  {dossiers}
  {relationSuivis}
  {services}
  {recentSearches}
  {notificationByDossier}
  showFilterEnjeu={false}
  showFilterActionInstructeur
/>
