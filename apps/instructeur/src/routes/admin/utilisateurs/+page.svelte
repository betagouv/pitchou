<script lang="ts">
  import { store } from "$front/store.svelte.ts";
  import Squelette from "$front/components/Squelette.svelte";
  import Loader from "$front/components/Loader.svelte";
  import { loadUtilisateursAARRI } from "$front/actions/admin.ts";

  import UtilisateursList from "./UtilisateursList.svelte";

  const initP = loadUtilisateursAARRI();

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
</script>

<Squelette
  {email}
  nav={Boolean(email)}
  title="Administration — utilisateurices"
  {erreurs}
  {résultatsSynchronisationDS88444}
>
  {#await initP}
    <Loader></Loader>
  {:then utilisateurs}
    <UtilisateursList {utilisateurs} />
  {:catch error}
    <div class="fr-alert fr-alert--error fr-mb-3w">
      <h3 class="fr-alert__title">Impossible d'afficher la liste des utilisateurices :</h3>
      <p>{error.message}</p>
    </div>
  {/await}
</Squelette>
