<script lang="ts">
  import Loader from "$lib/components/Loader.svelte";
  import { chargerListeEspecesProtegees } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";

  import ListeEspecesProtegees from "./ListeEspecesProtegees.svelte";

  const initP = chargerListeEspecesProtegees();
</script>

<svelte:head>
  <title>Espèces protégées — Pitchou</title>
</svelte:head>

{#await initP}
  <Loader></Loader>
{:then { espèceByCD_REF: especeByCD_REF }}
  <ListeEspecesProtegees especes={[...especeByCD_REF.values()]} />
{:catch error}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement des espèces protégées :</h3>
    <p>{error.message}</p>
  </div>
{/await}
