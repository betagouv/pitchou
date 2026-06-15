<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import ImportDossierBFC from "./ImportDossierBFC.svelte";
  import { chargerDossiers } from "$lib/dossier/dossier.ts";

  onMount(async () => {
    if (store.capabilities.listerDossiers) {
      await chargerDossiers().catch((err) => console.error({ err }));
    } else {
      console.error("store.capabilities.listerDossiers undefined");
    }
  });

  const email = $derived(store.identité?.email);
  const dossiers = $derived([...store.dossiersRésumés.values()]);
  const schema = $derived(store.schemaDS88444);
</script>

<ImportDossierBFC {email} {dossiers} {schema} />
