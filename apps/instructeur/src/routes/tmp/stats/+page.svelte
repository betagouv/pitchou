<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import TmpStats from "./TmpStats.svelte";
  import { loadDossiers } from "$lib/dossier/dossier.ts";

  onMount(async () => {
    if (store.dossierSummaries.size === 0) {
      await loadDossiers().catch((err) => console.error("Erreur chargement dossiers", err));
    }
  });

  const dossiers = $derived([...store.dossierSummaries.values()]);
</script>

<TmpStats {dossiers} />
