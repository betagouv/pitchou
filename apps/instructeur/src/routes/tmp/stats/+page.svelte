<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$front/store.svelte.ts";
  import TmpStats from "$front/components/screens/TmpStats.svelte";
  import { chargerDossiers } from "$front/actions/dossier.ts";

  onMount(async () => {
    if (store.dossiersRésumés.size === 0) {
      await chargerDossiers().catch((err) => console.error("Erreur chargement dossiers", err));
    }
  });

  const email = $derived(store.identité?.email);
  const dossiers = $derived([...store.dossiersRésumés.values()]);
</script>

<TmpStats {email} {dossiers} />
