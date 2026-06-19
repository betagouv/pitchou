<script lang="ts">
  import Loader from "$lib/components/Loader.svelte";
  import { loadUtilisateursAARRI } from "$lib/actions/admin.ts";

  import UtilisateursList from "./UtilisateursList.svelte";

  const initP = loadUtilisateursAARRI();
</script>

<svelte:head>
  <title>Administration — utilisateurices — Pitchou</title>
</svelte:head>

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
