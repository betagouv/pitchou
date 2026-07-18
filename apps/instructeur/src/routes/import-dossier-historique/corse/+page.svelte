<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import ImportDossierCorse from "./ImportDossierCorse.svelte";
  import { loadDossiers } from "$lib/dossier/dossier.ts";

  onMount(async () => {
    if (store.capabilities.listerDossiers) {
      await loadDossiers().catch((err) => console.error({ err }));
    } else {
      console.error("store.capabilities.listerDossiers undefined");
    }
  });

  const dossiers = $derived([...store.dossierSummaries.values()]);
  const schema = $derived(store.schemaDS88444);
</script>

<ImportDossierCorse {dossiers} {schema} />
