<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import PreremplissageDerogation from "./PreremplissageDerogation.svelte";

  const schemaDS88444 = $derived(store.schemaDS88444);
</script>

{#if schemaDS88444}
  <PreremplissageDerogation {schemaDS88444} />
{/if}
