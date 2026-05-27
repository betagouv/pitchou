<script>
  import { onMount } from "svelte";
  import { store } from "$front/store.svelte.ts";
  import ImportDossierCorse from "$front/components/screens/ImportDossierCorse.svelte";
  import { chargerDossiers } from "$front/actions/dossier.js";

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

<ImportDossierCorse {email} {dossiers} {schema} />
