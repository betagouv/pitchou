<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  let { projet }: { projet: DossierSummary["projet"] } = $props();
</script>

{#if projet}
  <p class="fr-text--xs fr-mb-0">{projet.count} demandes · Affichage : {projet.demandeLabel}</p>
  {#if projet.matchingCount !== undefined && projet.matchingCount !== projet.count}
    <p class="fr-text--xs fr-mb-0">{projet.matchingCount} demande(s) correspondent aux filtres</p>
  {/if}
{/if}
