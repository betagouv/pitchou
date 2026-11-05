<script lang="ts">
  import ServerDossiersList from "#lib/components/ListDossiers/ServerDossiersList.svelte";
</script>

<svelte:head><title>Mes dossiers — Pitchou</title></svelte:head>

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

<ServerDossiersList
  scope="followed"
  title="Mes dossiers"
  followedOnly
  showFilterEnjeu={false}
  showFilterActionInstructeur
  showFilterUnread
  {emptyListMessage}
/>
