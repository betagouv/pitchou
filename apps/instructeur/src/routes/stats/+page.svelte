<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import Loader from "$lib/components/Loader.svelte";
  import Squelette from "$lib/components/Squelette.svelte";
  import StatsContenu from "$lib/components/stats/StatsContenu.svelte";
  import IndicateursAARRI from "$lib/components/stats/IndicateursAARRI.svelte";
  import { chargerStats } from "$lib/actions/stats.ts";
  import { chargerIndicateursAARRI } from "$lib/actions/aarri.ts";

  const statsP = chargerStats();
  const indicateursParDateP = chargerIndicateursAARRI();

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
</script>

<Squelette
  {email}
  nav={Boolean(email)}
  title="Statistiques"
  {erreurs}
  {résultatsSynchronisationDS88444}
>
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
</Squelette>
