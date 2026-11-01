<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "#lib/state/store.svelte.ts";

  import ListDossiers from "#lib/components/ListDossiers/ListDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierSummary[];
    followRelations?: PitchouState["followRelations"];
    services?: string[];
    recentSearches?: string[];
    notificationByDossier: PitchouState["notificationByDossier"];
  };

  let {
    email = "",
    dossiers = [],
    followRelations,
    services = [],
    recentSearches = [],
    notificationByDossier,
  }: Props = $props();
</script>

<svelte:head>
  <title>Mes dossiers — Pitchou</title>
</svelte:head>

{#snippet emptyListMessage({ wholeListEmpty }: { wholeListEmpty: boolean })}
  {#if wholeListEmpty}
    <p>
      Vous ne suivez aucun dossier pour le moment. Vous pouvez consulter
      <a class="fr-link" href="/tous-les-dossiers">tous les dossiers</a> pour commencer à en suivre.
    </p>
  {:else}
    <p>Aucun dossier n'a été trouvé.</p>
  {/if}
{/snippet}

<!-- This list contains the current user’s personally followed dossiers. -->
<ListDossiers
  title="Mes dossiers"
  followedOnly
  {email}
  {dossiers}
  {followRelations}
  {services}
  {recentSearches}
  {notificationByDossier}
  showFilterEnjeu={false}
  showFilterActionInstructeur
  showFilterUnread
  {emptyListMessage}
/>
