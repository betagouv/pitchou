<script lang="ts">
  import Loader from "@pitchou/ui/Loader.svelte";
  import { loadReferentielRows } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";

  import ReferentielTypeImpact from "./ReferentielTypeImpact.svelte";

  const initP = loadReferentielRows();
</script>

<svelte:head>
  <title>Référentiel des types d’impact — Pitchou</title>
</svelte:head>

{#await initP}
  <Loader></Loader>
{:then referentiel}
  <ReferentielTypeImpact {referentiel} />
{:catch error}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement du référentiel :</h3>
    <p>{error.message}</p>
  </div>
{/await}
