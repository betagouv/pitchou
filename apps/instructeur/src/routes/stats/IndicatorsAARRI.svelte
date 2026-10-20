<script lang="ts">
  import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import AARRIIndicatorsContent from "./IndicatorsAARRI/AARRIIndicatorsContent.svelte";

  let { indicatorsByDateP }: { indicatorsByDateP: Promise<IndicatorsAARRI[]> } = $props();

  // Keep selections when a refreshed promise recreates the loaded content.
  let startDate = $state<IndicatorsAARRI["date"]>();
  let endDate = $state<IndicatorsAARRI["date"]>();
</script>

<div class="fr-my-6w">
  <h1>Suivi des indicateurs AARRI</h1>

  {#await indicatorsByDateP}
    <Loader />
  {:then indicatorsByDate}
    {#if indicatorsByDate.length === 0}
      <p>Aucun indicateur disponible.</p>
    {:else}
      <AARRIIndicatorsContent {indicatorsByDate} bind:startDate bind:endDate />
    {/if}
  {:catch}
    <p role="alert">Impossible de charger les indicateurs.</p>
  {/await}
</div>
