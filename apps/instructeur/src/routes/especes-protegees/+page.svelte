<script lang="ts">
  import Loader from "@pitchou/ui/Loader.svelte";
  import { chargerListeEspècesProtégées } from "$lib/especes/activitésMéthodesMoyensDePoursuite.ts";

  import ListeEspecesProtegees from "./ListeEspecesProtegees.svelte";

  const initP = chargerListeEspècesProtégées();
</script>

<svelte:head>
  <title>Espèces protégées — Pitchou</title>
</svelte:head>

{#await initP}
  <Loader></Loader>
{:then { espèceByCD_REF }}
  <ListeEspecesProtegees especes={[...espèceByCD_REF.values()]} />
{:catch error}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement des espèces protégées :</h3>
    <p>{error.message}</p>
  </div>
{/await}
