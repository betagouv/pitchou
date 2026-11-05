<script lang="ts">
  import ServerDossiersList from "#lib/components/ListDossiers/ServerDossiersList.svelte";
</script>

<svelte:head><title>Tous les dossiers — Pitchou</title></svelte:head>

<ServerDossiersList scope="all" title="Tous les dossiers" showFilterInstructeurice />
