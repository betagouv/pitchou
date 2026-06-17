<script lang="ts">
  import { store } from "$front/store.svelte.ts";
  import Squelette from "$front/components/Squelette.svelte";
  import Loader from "$front/components/Loader.svelte";
  import { chargerListeEspècesProtégées } from "$front/actions/activitésMéthodesMoyensDePoursuite.ts";

  import ListeEspecesProtegees from "./ListeEspecesProtegees.svelte";

  const initP = chargerListeEspècesProtégées();

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
</script>

<Squelette
  {email}
  nav={Boolean(email)}
  title="Espèces protégées"
  {erreurs}
  {résultatsSynchronisationDS88444}
>
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
</Squelette>
