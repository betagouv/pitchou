<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import DossierDetailProjet from "../../../routes/dossier/[dossierId]/Dossier/DossierDetailProjet.svelte";
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
  let { dossierId }: { dossierId: DossierId } = $props();
  const dossier = $derived(store.fullDossiers.get(dossierId));
</script>

{#if dossier}<DossierDetailProjet {dossier} anomalies={undefined} />{/if}
