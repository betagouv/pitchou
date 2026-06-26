<script lang="ts">
  import Loader from "@pitchou/ui/Loader.svelte";
  import StatsContent from "./StatsContent.svelte";
  import IndicatorsAARRI from "./IndicatorsAARRI.svelte";
  import { loadStats } from "$lib/stats/stats.ts";
  import { loadIndicatorsAARRI } from "$lib/shared/aarri.ts";

  const statsP = loadStats();
  const indicatorsByDateP = loadIndicatorsAARRI();
</script>

<svelte:head>
  <title>Statistiques — Pitchou</title>
</svelte:head>

{#await statsP}
  <Loader></Loader>
{:then stats}
  <StatsContent {stats} />
{:catch error}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Une erreur est survenue lors du chargement des statistiques :</h3>
    <p>{error.message}</p>
  </div>
{/await}

<IndicatorsAARRI {indicatorsByDateP} />
