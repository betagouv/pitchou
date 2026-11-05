<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  let { projet }: { projet: DossierSummary["projet"] } = $props();
</script>

{#if projet}
  <p class="fr-text--xs fr-mb-0">{projet.count} {projet.count === 1 ? "demande" : "demandes"}</p>
{/if}
