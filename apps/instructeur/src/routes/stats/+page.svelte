<script lang="ts">
  import Loader from "$lib/components/Loader.svelte";
  import StatsContenu from "./StatsContenu.svelte";
  import IndicateursAARRI from "./IndicateursAARRI.svelte";
  import { loadStats } from "$lib/stats/stats.ts";
  import { loadIndicateursAARRI } from "$lib/shared/aarri.ts";

  const statsP = loadStats();
  const indicateursParDateP = loadIndicateursAARRI();
</script>

<svelte:head>
  <title>Statistiques — Pitchou</title>
</svelte:head>

{#await statsP}
  <Loader></Loader>
{:then stats}
  <StatsContenu {stats} />
{:catch error}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Une erreur est survenue lors du chargement des statistiques :</h3>
    <p>{error.message}</p>
  </div>
{/await}

<IndicateursAARRI {indicateursParDateP} />
