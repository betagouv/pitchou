<script>
  import { store } from "$front/store.svelte.ts";
  import PreremplissageDerogation from "$front/components/screens/PreremplissageDerogation.svelte";

  const email = $derived(store.identité?.email);
  const schemaDS88444 = $derived(store.schemaDS88444);
</script>

{#if schemaDS88444}
  <PreremplissageDerogation {email} {schemaDS88444} />
{/if}
